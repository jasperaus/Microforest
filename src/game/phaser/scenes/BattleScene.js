import {
  TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
  TILE_GRASS, TILE_WALL, TILE_WATER, TILE_OBJECTIVE,
  HIGHLIGHT_MOVE, HIGHLIGHT_ATTACK, HIGHLIGHT_SELECT, HIGHLIGHT_SPECIAL,
  PHASE,
} from '../../config.js';
import mechsData from '../../data/mechs.json';
import weaponsData from '../../data/weapons.json';
import campaignsData from '../../data/campaigns.json';
import Mech from '../entities/Mech.js';
import TurnManager from '../systems/TurnManager.js';
import AIController from '../systems/AIController.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat } from '../systems/CombatResolver.js';
import { getReachableTiles, getAttackTiles, manhattanDistance } from '../systems/PathFinder.js';
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
    this.grid = [];           // 2D array of tile objects
    this.playerMechs = [];
    this.enemyMechs = [];
    this.highlightSprites = []; // active highlight rectangles
    this.weaponsMap = {};

    // Pre-index weapons
    weaponsData.forEach(w => { this.weaponsMap[w.id] = w; });

    // Build map
    this._buildGrid();

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

  // ── Grid ──────────────────────────────────────────────────────────────────

  _buildGrid() {
    const mapData = this.mission.map;

    for (let row = 0; row < mapData.length; row++) {
      this.grid[row] = [];
      for (let col = 0; col < mapData[row].length; col++) {
        const type = mapData[row][col];
        const x = this.tileX(col);
        const y = this.tileY(row);

        const textureKey = ['tile_grass', 'tile_wall', 'tile_water', 'tile_objective'][type] || 'tile_grass';
        const sprite = this.add.image(x, y, textureKey).setDepth(0);

        // Grid line
        const border = this.add.rectangle(x, y, TILE_SIZE - 1, TILE_SIZE - 1, 0x000000, 0)
          .setStrokeStyle(0.5, 0x000000, 0.3).setDepth(1);

        this.grid[row][col] = {
          row, col, type,
          x, y,
          walkable: type === TILE_GRASS || type === TILE_OBJECTIVE,
          mech: null,
          sprite,
          border,
          highlight: null,
        };
      }
    }
  }

  tileX(col) { return GRID_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2; }
  tileY(row) { return GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2; }

  pixelToGrid(px, py) {
    const col = Math.floor((px - GRID_OFFSET_X) / TILE_SIZE);
    const row = Math.floor((py - GRID_OFFSET_Y) / TILE_SIZE);
    return { row, col };
  }

  isValidTile(row, col) {
    return row >= 0 && row < this.grid.length && col >= 0 && col < this.grid[0].length;
  }

  isValidAndEmpty(row, col) {
    if (!this.isValidTile(row, col)) return false;
    const tile = this.grid[row][col];
    return tile.walkable && tile.mech === null;
  }

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

    finalSpawns.forEach(spawn => {
      const data = mechLookup[spawn.mechId];
      if (!data) return;
      const mech = new Mech(this,
        this.tileX(spawn.col),
        this.tileY(spawn.row),
        { ...data, row: spawn.row, col: spawn.col }
      );
      this.grid[spawn.row][spawn.col].mech = mech;
      this.playerMechs.push(mech);
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

  // ── Highlight management ──────────────────────────────────────────────────

  clearHighlights() {
    this.highlightSprites.forEach(s => s.destroy());
    this.highlightSprites = [];
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[0].length; col++) {
        this.grid[row][col].highlight = null;
      }
    }
    // Clear mech selection rings
    [...this.playerMechs, ...this.enemyMechs].forEach(m => m.alive && m.setSelected && m.setSelected(false));
  }

  showMoveHighlights(mech) {
    if (mech.ap < 1) return;
    const allMechs = [...this.playerMechs, ...this.enemyMechs].filter(m => m.alive && m !== mech);
    const tiles = getReachableTiles(this.grid, mech.row, mech.col, mech.speed, allMechs);

    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (!tile.walkable || tile.mech) return;
      const hl = this.add.rectangle(tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_MOVE, 0.35)
        .setStrokeStyle(1.5, HIGHLIGHT_MOVE, 0.9).setDepth(5);
      tile.highlight = 'move';
      this.highlightSprites.push(hl);
    });

    // Selected mech ring
    mech.setSelected(true);

    // Show attack range as a faint overlay
    const weapon = this.getWeapon(mech, 0);
    if (weapon) {
      const attackTiles = getAttackTiles(this.grid, mech.row, mech.col, weapon.range);
      attackTiles.forEach(({ row, col }) => {
        const tile = this.grid[row][col];
        if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
          const hl = this.add.rectangle(tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_ATTACK, 0.18)
            .setStrokeStyle(1, HIGHLIGHT_ATTACK, 0.5).setDepth(5);
          this.highlightSprites.push(hl);
        }
      });
    }
  }

  showAttackHighlights(mech, rangeOverride) {
    const weapon = this.getWeapon(mech, 0);
    const range = rangeOverride !== undefined ? rangeOverride : (weapon ? weapon.range : 3);

    const tiles = getAttackTiles(this.grid, mech.row, mech.col, range);
    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
        const hl = this.add.rectangle(tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_ATTACK, 0.4)
          .setStrokeStyle(2, HIGHLIGHT_ATTACK, 1).setDepth(5);
        tile.highlight = 'attack';
        this.highlightSprites.push(hl);
      }
    });

    mech.setSelected(true);
  }

  // ── Weapon helpers ────────────────────────────────────────────────────────

  getWeapon(mech, index = 0) {
    const weaponId = mech.weapons[index] || mech.weapons[0];
    return this.weaponsMap[weaponId] || null;
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  async resolveCombat(attacker, target, weaponIndex, options = {}) {
    const weapon = this.getWeapon(attacker, weaponIndex);
    if (!weapon && !options.damage) return { hit: false, damage: 0, heatGain: 0, logMessage: 'No weapon!' };

    const effectiveDamage = options.damage || weapon.damage;
    const effectiveWeapon = options.damage ? { ...weapon, damage: effectiveDamage } : weapon;
    const flanking = options.flanking !== undefined ? options.flanking : isFlanking(attacker, target);

    const result = resolveAttack(attacker, target, effectiveWeapon, { ...options, flanking });

    // Apply heat to attacker
    applyHeat(attacker, result.heatGain);

    if (result.hit) {
      // Apply damage to target
      const died = applyDamage(target, result.damage, flanking);
      await target.playHitEffect(result.damage);

      if (died) {
        target.alive = false;
        await target.playDeathEffect();
        this.grid[target.row][target.col].mech = null;

        if (target.team === 'enemy') this.stats.enemiesKilled++;
        else this.stats.mechsLost++;

        EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
      }
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
    const enemyAlive = this.enemyMechs.filter(m => m.alive);

    if (playerAlive.length === 0) {
      this._endGame(false);
      return true;
    }
    if (enemyAlive.length === 0) {
      this._endGame(true);
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
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result = [];
    dirs.forEach(([dr, dc]) => {
      const nr = row + dr, nc = col + dc;
      if (!this.isValidTile(nr, nc)) return;
      const m = this.grid[nr][nc].mech;
      if (m && m.alive && (team === 'any' || m.team === team)) result.push(m);
    });
    return result;
  }

  _showMissionHeader() {
    const { name, subtitle, objective } = this.mission;
    const missionNum = this.missionIndex + 1;

    const panel = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2 - 20,
      360, 90, 0x000000, 0.85
    ).setDepth(90).setStrokeStyle(2, 0x00eedd, 0.9);

    const t1 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 48,
      `MISSION ${missionNum}: ${name.toUpperCase()}`, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#00eedd',
    }).setOrigin(0.5).setDepth(91);

    const t2 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 26, subtitle, {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaccff',
    }).setOrigin(0.5).setDepth(91);

    const t3 = this.add.text(this.scale.width / 2, this.scale.height / 2 - 6,
      `Objective: ${objective}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffcc44',
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
