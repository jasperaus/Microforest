/**
 * GameContext — plain JS dependency container that replaces `this.scene` for
 * TurnManager, AIController, and AbilityFactory.
 *
 * R3F components inject callbacks after mount so game-logic systems can
 * trigger animations and highlights without knowing about React or Three.js.
 */

import { GRID_COLS, GRID_ROWS } from './config.js';
import { getReachableTiles, getAttackTiles } from './phaser/systems/PathFinder.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat } from './phaser/systems/CombatResolver.js';
import EventBridge from './phaser/EventBridge.js';
import { safeAnim } from './r3f/animUtils.js';

// Hex world-space constants (R = 1.0 unit per hex circumradius)
const R = 1.0;
const X_SPACING = R * Math.sqrt(3);   // ≈ 1.732
const Z_SPACING = R * 1.5;            // 1.5

export function createGameContext(missionIndex, mission, weaponsData) {
  // Pre-index weapons
  const weaponsMap = {};
  weaponsData.forEach(w => { weaponsMap[w.id] = w; });

  // World-origin offsets so the grid is centred at [0, 0, 0]
  const OX = -((GRID_COLS - 1) * X_SPACING) / 2;
  const OZ = -((GRID_ROWS - 1) * Z_SPACING) / 2;

  const ctx = {
    // ── State ────────────────────────────────────────────────────────────────
    missionIndex,
    mission,
    playerMechs: [],
    enemyMechs: [],
    grid: [],          // grid[row][col] = { row, col, type, walkable, mech, highlight }
    weaponsMap,
    stats: { turns: 0, enemiesKilled: 0, mechsLost: 0 },

    // ── Injected by R3F components ────────────────────────────────────────────
    /** (highlightMap: Map<"row,col", 'move'|'attack'|null>) => void */
    _setHighlights: null,
    /** Map<mechId, { moveTo, playHitEffect, playMissEffect, playDeathEffect,
     *                  playHealEffect, playStealthEffect, playOverheatEffect }> */
    _mechAnimations: new Map(),
    /** (duration: number, intensity: number) => void */
    _shakeCamera: null,
    /** (sceneName: string, data?: object) => void */
    _setActiveScene: null,
    /** (type: string, position: [x,y,z], options?: object) => void — set by CombatEffects */
    spawnEffect: null,

    // ── Coordinate helpers ────────────────────────────────────────────────────

    /**
     * Convert grid (col, row) → world-space [x, z] for the hex centre.
     * Pointy-top odd-r offset: odd rows shift right by half a hex width.
     */
    tileXZ(col, row) {
      const x = OX + col * X_SPACING + (row % 2 === 1 ? X_SPACING / 2 : 0);
      const z = OZ + row * Z_SPACING;
      return [x, z];
    },

    // ── Mech animation registry ───────────────────────────────────────────────

    getMechAnim(id) {
      return this._mechAnimations.get(id) || null;
    },

    registerMechAnim(id, api) {
      this._mechAnimations.set(id, api);
    },

    // ── Camera ────────────────────────────────────────────────────────────────

    shakeCamera(duration = 200, intensity = 0.012) {
      this._shakeCamera?.(duration, intensity);
    },

    // ── Scene management ──────────────────────────────────────────────────────

    startScene(name, data = {}) {
      this._setActiveScene?.(name, data);
    },

    // ── Grid helpers ──────────────────────────────────────────────────────────

    isValidTile(row, col) {
      return row >= 0 && row < this.grid.length &&
             col >= 0 && col < (this.grid[0]?.length ?? 0);
    },

    isValidAndEmpty(row, col) {
      if (!this.isValidTile(row, col)) return false;
      const tile = this.grid[row][col];
      return tile.walkable && tile.mech === null;
    },

    getAdjacentMechs(row, col, team) {
      const results = [];
      const dirs = row % 2 === 0
        ? [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
        : [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]];
      for (const [dr, dc] of dirs) {
        const nr = row + dr, nc = col + dc;
        if (!this.isValidTile(nr, nc)) continue;
        const m = this.grid[nr][nc].mech;
        if (m && m.alive && m.team === team) results.push(m);
      }
      return results;
    },

    // ── Highlight management ──────────────────────────────────────────────────

    clearHighlights() {
      for (const row of this.grid) {
        for (const tile of row) { tile.highlight = null; }
      }
      this._setHighlights?.(new Map());
    },

    showMoveHighlights(mech) {
      const blockers = [
        ...this.playerMechs.filter(m => m.alive && m !== mech),
        ...this.enemyMechs.filter(m => m.alive),
      ];
      const reachable = getReachableTiles(this.grid, mech.row, mech.col, mech.speed, blockers);
      const map = new Map();
      for (const { row, col } of reachable) {
        this.grid[row][col].highlight = 'move';
        map.set(`${row},${col}`, 'move');
      }
      this._setHighlights?.(map);
    },

    showAttackHighlights(mech, rangeOverride) {
      const weapon = this.getWeapon(mech, 0);
      const range = rangeOverride ?? weapon?.range ?? 3;
      const tiles = getAttackTiles(this.grid, mech.row, mech.col, range, true);
      const map = new Map();
      for (const { row, col } of tiles) {
        const tile = this.grid[row][col];
        if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
          tile.highlight = 'attack';
          map.set(`${row},${col}`, 'attack');
        }
      }
      this._setHighlights?.(map);
    },

    // ── Weapon helper ─────────────────────────────────────────────────────────

    getWeapon(mech, index = 0) {
      const weaponId = mech.weapons[index] || mech.weapons[0];
      return this.weaponsMap[weaponId] || null;
    },

    // ── Combat ────────────────────────────────────────────────────────────────

    async resolveCombat(attacker, target, weaponIndex = 0, options = {}) {
      const weapon = this.getWeapon(attacker, weaponIndex);
      if (!weapon && options.damage === undefined) {
        return { hit: false, damage: 0, heatGain: 0, logMessage: 'No weapon!' };
      }

      const effectiveDamage = options.damage !== undefined
        ? options.damage
        : weapon.damage + (options.damageBonus || 0);
      const effectiveWeapon = (options.damage !== undefined || options.damageBonus)
        ? { ...weapon, damage: effectiveDamage }
        : weapon;

      const flanking = options.flanking !== undefined
        ? options.flanking
        : isFlanking(attacker, target);

      const result = resolveAttack(attacker, target, effectiveWeapon, {
        ...options,
        flanking,
        grid: this.grid,
      });

      const overheatedNow = applyHeat(attacker, result.heatGain);

      if (result.hit) {
        const prevFrontArmor = target.frontArmor;
        const prevRearArmor  = target.rearArmor;
        const died = applyDamage(target, result.damage, flanking);

        const armorBroken = flanking
          ? (prevRearArmor > 0 && target.rearArmor <= 0)
          : (prevFrontArmor > 0 && target.frontArmor <= 0);

        const anim = this.getMechAnim(target.id);
        if (anim) {
          await safeAnim(anim.playHitEffect(result.damage, { isCrit: result.isCrit, armorBroken }));
        }

        // VFX — impact ring on hit
        const [tx, tz] = this.tileXZ(target.col, target.row);
        const hitColor = target.team === 'player' ? '#4488ff' : '#ff4444';
        this.spawnEffect?.('impact', [tx, 0.5, tz], { color: hitColor });
        this.spawnEffect?.('muzzle', [tx, 0.5, tz], { color: result.isCrit ? '#ffaa00' : '#ffdd88' });

        if (died) {
          target.alive = false;
          const animDead = this.getMechAnim(target.id);
          if (animDead) await safeAnim(animDead.playDeathEffect());
          this.shakeCamera(350, 0.02);
          this.grid[target.row][target.col].mech = null;

          if (target.team === 'enemy') this.stats.enemiesKilled++;
          else this.stats.mechsLost++;

          EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
        } else {
          if (result.damage >= 15) this.shakeCamera(120, 0.008);
          if (overheatedNow) {
            const animAtk = this.getMechAnim(attacker.id);
            if (animAtk) await safeAnim(animAtk.playOverheatEffect());
          }
        }
      } else {
        const anim = this.getMechAnim(target.id);
        if (anim) await safeAnim(anim.playMissEffect());
      }

      EventBridge.emit('mechUpdated', attacker.getState());
      if (target.alive) EventBridge.emit('mechUpdated', target.getState());

      return result;
    },

    // ── Win/loss detection ────────────────────────────────────────────────────

    checkGameOver() {
      const playerAlive = this.playerMechs.filter(m => m.alive);
      const enemyAlive  = this.enemyMechs.filter(m => m.alive);

      if (enemyAlive.length === 0) {
        this._endGame(true);
        return true;
      }
      if (playerAlive.length === 0) {
        this._endGame(false);
        return true;
      }
      return false;
    },

    _endGame(won) {
      this.stats.turns = this.turnManager?.getTurn?.() ?? 0;
      // Lock the turn manager into GAME_OVER so no further actions can fire
      if (this.turnManager) {
        this.turnManager.setPhase('GAME_OVER');
      }
      EventBridge.emit('gameOver', { won, stats: this.stats });

      setTimeout(() => {
        this.startScene('VictoryScene', { won, missionIndex: this.missionIndex, stats: this.stats });
      }, 2500);
    },

    // ── Scheduler helper ──────────────────────────────────────────────────────

    /** Phaser-compatible time.delayedCall shim. */
    time: {
      delayedCall(ms, cb) {
        const id = setTimeout(cb, ms);
        return { remove: () => clearTimeout(id) };
      },
    },

    // ── Placeholder refs (set by BattleScene3D) ───────────────────────────────
    turnManager: null,
    aiController: null,
  };

  return ctx;
}
