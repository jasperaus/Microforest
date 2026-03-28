import Phaser from 'phaser';
import { PHASE } from '../../config.js';
import mechsData from '../../data/mechs.json';
import weaponsData from '../../data/weapons.json';
import campaignsData from '../../data/campaigns.json';
import Mech from '../entities/Mech.js';
import TurnManager from '../systems/TurnManager.js';
import AIController from '../systems/AIController.js';
import GridManager from '../systems/GridManager.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat } from '../systems/CombatResolver.js';
import EventBridge from '../EventBridge.js';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  init(data) {
    this.missionIndex = data.missionIndex || 0;
    this.selectedMechIds = data.selectedMechs || null;
    this.mission = campaignsData[this.missionIndex];

    this.stats = { turns: 0, enemiesKilled: 0, mechsLost: 0 };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  create() {
    this.playerMechs = [];
    this.enemyMechs = [];
    this.weaponsMap = {};

    // Pre-index weapons
    weaponsData.forEach(w => { this.weaponsMap[w.id] = w; });

    // GridManager owns the tile grid and all highlight logic
    this.gridManager = new GridManager(this);
    this.grid = this.gridManager.build(this.mission.map);
    // Keep a flat highlightSprites reference for legacy compatibility
    this.highlightSprites = this.gridManager.highlightSprites;

    // Spawn mechs
    this._spawnMechs();

    // Systems
    this.turnManager = new TurnManager(this);
    this.aiController = new AIController(this);

    // Input
    this._setupInput();

    // Dim overlay for transitions
    this.dimOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
      .setOrigin(0, 0).setDepth(100);

    // Mission header (fades out)
    this._showMissionHeader();

    // Start player turn
    this.time.delayedCall(1200, () => {
      this.turnManager.startPlayerTurn();
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ── Grid wrappers (delegate to GridManager) ───────────────────────────────

  tileX(col) { return this.gridManager.tileX(col); }
  tileY(row) { return this.gridManager.tileY(row); }
  pixelToGrid(px, py) { return this.gridManager.pixelToGrid(px, py); }
  isValidTile(row, col) { return this.gridManager.isValidTile(row, col); }
  isValidAndEmpty(row, col) { return this.gridManager.isValidAndEmpty(row, col); }

  // ── Mech spawning ─────────────────────────────────────────────────────────

  _spawnMechs() {
    const mechLookup = {};
    mechsData.forEach(m => { mechLookup[m.id] = m; });

    // Build the list of spawns to deploy.
    // selectedMechIds are the mech IDs the player picked; we pair them with
    // sequential spawn positions from the mission (ignoring the mission's preset mechId).
    const spawns = this.mission.playerSpawns;
    let finalSpawns;
    if (this.selectedMechIds && this.selectedMechIds.length > 0) {
      // Map selected mechs to spawn positions in order
      finalSpawns = this.selectedMechIds
        .slice(0, spawns.length)
        .map((mechId, i) => ({ ...spawns[i], mechId }));
    } else {
      finalSpawns = spawns;
    }

    finalSpawns.forEach((spawn, i) => {
      const data = mechLookup[spawn.mechId];
      if (!data) return;
      const targetY = this.tileY(spawn.row);
      const mech = new Mech(this,
        this.tileX(spawn.col),
        targetY - 60,
        { ...data, row: spawn.row, col: spawn.col }
      );
      this.grid[spawn.row][spawn.col].mech = mech;
      this.playerMechs.push(mech);
      // Drop-in animation — staggered bounce from above
      this.tweens.add({
        targets: mech,
        y: targetY,
        duration: 400,
        delay: i * 150,
        ease: 'Bounce.easeOut',
      });
    });

    // Enemy spawns
    this.mission.enemySpawns.forEach(spawn => {
      const data = mechLookup[spawn.mechId];
      if (!data) return;
      const mech = new Mech(this,
        this.tileX(spawn.col),
        this.tileY(spawn.row),
        { ...data, row: spawn.row, col: spawn.col, team: 'enemy' }
      );
      this.grid[spawn.row][spawn.col].mech = mech;
      this.enemyMechs.push(mech);
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.on('pointerdown', (pointer) => {
      // Convert screen coords (Phaser uses canvas-local coords automatically)
      const { row, col } = this.pixelToGrid(pointer.x, pointer.y);

      if (!this.isValidTile(row, col)) return;

      const phase = this.turnManager.getPhase();
      const tile = this.grid[row][col];

      if (phase === PHASE.ENEMY_TURN || phase === PHASE.MOVING || phase === PHASE.RESOLVING) return;

      if (phase === PHASE.MECH_SELECTED) {
        const sel = this.turnManager.selectedMech;
        // Click own mech — reselect
        if (tile.mech && tile.mech.team === 'player' && tile.mech !== sel) {
          this.turnManager.selectMech(tile.mech);
          return;
        }
        // Click highlighted move tile
        if (tile.highlight === 'move') {
          this.turnManager.executeMove(sel, row, col);
          return;
        }
        // Click elsewhere — deselect
        if (!tile.mech || tile.mech.team !== 'player') {
          this.turnManager.deselectMech();
        }
        return;
      }

      if (phase === PHASE.ATTACK_SELECT || phase === PHASE.SPECIAL_SELECT) {
        const sel = this.turnManager.selectedMech;
        if (tile.highlight === 'attack') {
          const targetMech = tile.mech;
          if (targetMech && targetMech.team === 'enemy') {
            if (phase === PHASE.SPECIAL_SELECT) {
              this.turnManager.executeSpecialAttack(sel, targetMech);
            } else {
              this.turnManager.executeAttack(sel, targetMech, 0);
            }
          }
          return;
        }
        if (!tile.mech || tile.mech.team !== 'enemy') {
          this.turnManager.deselectMech();
        }
        return;
      }

      if (phase === PHASE.IDLE) {
        if (tile.mech && tile.mech.team === 'player' && tile.mech.alive && tile.mech.ap > 0) {
          this.turnManager.selectMech(tile.mech);
        }
      }
    });
  }

  // ── Highlight management (delegate to GridManager) ────────────────────────

  clearHighlights() {
    this.gridManager.clearHighlights();
    this.highlightSprites = this.gridManager.highlightSprites;
  }

  showMoveHighlights(mech) { this.gridManager.showMoveHighlights(mech); }
  showAttackHighlights(mech, rangeOverride) { this.gridManager.showAttackHighlights(mech, rangeOverride); }

  // ── Weapon helpers ────────────────────────────────────────────────────────

  getWeapon(mech, index = 0) {
    const weaponId = mech.weapons[index] || mech.weapons[0];
    return this.weaponsMap[weaponId] || null;
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  async resolveCombat(attacker, target, weaponIndex, options = {}) {
    const weapon = this.getWeapon(attacker, weaponIndex);
    if (!weapon && !options.damage) return { hit: false, damage: 0, heatGain: 0, logMessage: 'No weapon!' };

    const effectiveDamage = options.damage !== undefined
      ? options.damage
      : weapon.damage + (options.damageBonus || 0);
    const effectiveWeapon = (options.damage !== undefined || options.damageBonus)
      ? { ...weapon, damage: effectiveDamage }
      : weapon;
    const flanking = options.flanking !== undefined ? options.flanking : isFlanking(attacker, target);

    // Pass the live grid so CombatResolver can check LoS and cover
    const result = resolveAttack(attacker, target, effectiveWeapon, {
      ...options,
      flanking,
      grid: this.grid,
    });

    // Apply heat to attacker
    const overheatedNow = applyHeat(attacker, result.heatGain);

    if (result.hit) {
      const prevFrontArmor = target.frontArmor;
      const prevRearArmor  = target.rearArmor;
      const died = applyDamage(target, result.damage, flanking);

      const armorBroken = flanking
        ? (prevRearArmor > 0 && target.rearArmor <= 0)
        : (prevFrontArmor > 0 && target.frontArmor <= 0);

      await target.playHitEffect(result.damage, { isCrit: result.isCrit, armorBroken });

      if (died) {
        target.alive = false;
        await target.playDeathEffect();
        this.cameras.main.shake(200, 0.012);
        this.grid[target.row][target.col].mech = null;

        if (target.team === 'enemy') this.stats.enemiesKilled++;
        else this.stats.mechsLost++;

        EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
      } else {
        if (result.damage >= 15) this.cameras.main.shake(100, 0.006);
      }

      if (overheatedNow) await attacker.playOverheatEffect();
    } else {
      await target.playMissEffect();
    }

    EventBridge.emit('mechUpdated', attacker.getState());
    if (target.alive) EventBridge.emit('mechUpdated', target.getState());

    return result;
  }

  // ── Win/loss detection ────────────────────────────────────────────────────

  checkGameOver() {
    const playerAlive = this.playerMechs.filter(m => m.alive);
    const enemyAlive  = this.enemyMechs.filter(m => m.alive);

    // Check enemy wipe first: if both sides die on the same action, player wins
    if (enemyAlive.length === 0) {
      this._endGame(true);
      return true;
    }
    if (playerAlive.length === 0) {
      this._endGame(false);
      return true;
    }
    return false;
  }

  _endGame(won) {
    this.turnManager.setPhase(PHASE.GAME_OVER);
    this.stats.turns = this.turnManager.getTurn();
    EventBridge.emit('gameOver', { won, stats: this.stats });

    this.time.delayedCall(1800, () => {
      this.cameras.main.fade(600, 0, 0, 0);
      this.time.delayedCall(700, () => {
        this.scene.start('VictoryScene', {
          won,
          missionIndex: this.missionIndex,
          stats: this.stats,
        });
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getAdjacentMechs(row, col, team) {
    return this.gridManager.getAdjacentMechs(row, col, team);
  }

  _showMissionHeader() {
    const { name, subtitle, objective } = this.mission;
    const missionNum = this.missionIndex + 1;

    const panel = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2 - 30,
      480, 120, 0x000000, 0.88
    ).setDepth(90).setStrokeStyle(2, 0x00eedd, 0.9);

    const t1 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 68,
      `MISSION ${missionNum}: ${name.toUpperCase()}`, {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#00eedd',
    }).setOrigin(0.5).setDepth(91);

    const t2 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 38, subtitle, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaccff',
    }).setOrigin(0.5).setDepth(91);

    const t3 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 12,
      `Objective: ${objective}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(91);

    const items = [panel, t1, t2, t3];
    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: items,
        alpha: 0,
        duration: 500,
        onComplete: () => items.forEach(i => i.destroy()),
      });
    });
  }
}
