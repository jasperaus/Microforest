import { PHASE } from '../../config.js';
import { coolDown } from './CombatResolver.js';
import EventBridge from '../EventBridge.js';

/**
 * TurnManager: controls the player/enemy turn cycle and game phase state machine.
 */
export default class TurnManager {
  constructor(scene) {
    this.scene = scene;
    this.phase = PHASE.IDLE;
    this.turnNumber = 1;
    this.activeTeam = 'player'; // 'player' | 'enemy'
    this.selectedMech = null;
    this.calledShotActive = false;
  }

  getPhase() { return this.phase; }
  getTeam() { return this.activeTeam; }
  getTurn() { return this.turnNumber; }

  setPhase(phase) {
    this.phase = phase;
    EventBridge.emit('phaseChange', { phase, team: this.activeTeam, turn: this.turnNumber });
  }

  // ── Player turn start ──────────────────────────────────────────────────────

  startPlayerTurn() {
    this.activeTeam = 'player';
    this.setPhase(PHASE.IDLE);

    // Reset AP and cool down heat for all player mechs
    this.scene.playerMechs.forEach(m => {
      if (!m.alive) return;
      m.ap = m.maxAp;
      m.activatedThisTurn = false;
      coolDown(m);
    });

    EventBridge.emit('turnStart', {
      team: 'player',
      turn: this.turnNumber,
      mechs: this.scene.playerMechs.filter(m => m.alive).map(m => m.getState()),
      enemyMechs: this.scene.enemyMechs.filter(m => m.alive).map(m => m.getState()),
    });
  }

  // ── Mech selection ─────────────────────────────────────────────────────────

  selectMech(mech) {
    if (this.phase === PHASE.MOVING || this.phase === PHASE.RESOLVING) return;
    if (mech.team !== 'player') return;
    if (!mech.alive) return;

    this.selectedMech = mech;
    this.scene.clearHighlights();
    this.scene.showMoveHighlights(mech);
    this.setPhase(PHASE.MECH_SELECTED);

    EventBridge.emit('mechSelected', mech.getState());
  }

  deselectMech() {
    this.selectedMech = null;
    this.scene.clearHighlights();
    this.setPhase(PHASE.IDLE);
    EventBridge.emit('mechDeselected', null);
  }

  // ── Move action ────────────────────────────────────────────────────────────

  requestMove(mech) {
    if (!mech || mech.ap < 1 || this.phase === PHASE.MOVING) return;
    this.scene.clearHighlights();
    this.scene.showMoveHighlights(mech);
    this.setPhase(PHASE.MECH_SELECTED);
  }

  async executeMove(mech, targetRow, targetCol) {
    if (!mech || mech.ap < 1) return;
    if (this.phase !== PHASE.MECH_SELECTED) return;

    this.setPhase(PHASE.MOVING);
    this.scene.clearHighlights();

    // Update grid tracking
    this.scene.grid[mech.row][mech.col].mech = null;
    mech.row = targetRow;
    mech.col = targetCol;
    this.scene.grid[targetRow][targetCol].mech = mech;

    // Animate movement
    await mech.moveTo(
      this.scene.tileX(targetCol),
      this.scene.tileY(targetRow)
    );

    mech.ap -= 1;
    mech.activatedThisTurn = true;

    EventBridge.emit('mechMoved', mech.getState());

    // Return to selected state
    this.selectedMech = mech;
    this.setPhase(PHASE.MECH_SELECTED);
    this.scene.showMoveHighlights(mech);
  }

  // ── Attack action ──────────────────────────────────────────────────────────

  requestAttack(mech) {
    if (!mech || mech.ap < 1) return;
    if (this.phase === PHASE.MOVING || this.phase === PHASE.RESOLVING) return;
    if (mech.overheated) {
      EventBridge.emit('log', `${mech.name} is overheated! Cannot attack.`);
      return;
    }

    this.selectedMech = mech;
    this.scene.clearHighlights();
    this.scene.showAttackHighlights(mech);
    this.setPhase(PHASE.ATTACK_SELECT);
  }

  async executeAttack(attacker, target, weaponIndex = 0) {
    if (this.phase !== PHASE.ATTACK_SELECT) return;
    if (!attacker || !target) return;
    if (attacker.ap < 1) return;

    this.setPhase(PHASE.RESOLVING);
    this.scene.clearHighlights();

    const options = { calledShot: attacker.calledShot || false };
    attacker.calledShot = false;
    this.calledShotActive = false;

    const result = await this.scene.resolveCombat(attacker, target, weaponIndex, options);
    attacker.ap -= 1;
    attacker.activatedThisTurn = true;

    EventBridge.emit('combatResult', { attacker: attacker.getState(), target: target.getState(), result });
    EventBridge.emit('log', result.logMessage);

    // Check win/loss
    if (this.scene.checkGameOver()) return;

    this.selectedMech = attacker;
    this.setPhase(PHASE.MECH_SELECTED);
    this.scene.showMoveHighlights(attacker);
  }

  // ── Special action ─────────────────────────────────────────────────────────

  requestSpecial(mech) {
    if (!mech || mech.ap < 2) {
      EventBridge.emit('log', 'Special requires 2 AP!');
      return;
    }
    if (mech.special === 'none') return;

    this.selectedMech = mech;
    this.executeSpecial(mech);
  }

  async executeSpecial(mech) {
    switch (mech.special) {
      case 'stealth':
        mech.stealthed = true;
        mech.ap -= 2;
        EventBridge.emit('log', `${mech.name} activates Ghost Mode — invisible for 1 round!`);
        await mech.playStealthEffect();
        break;

      case 'called_shot':
        mech.calledShot = true;
        mech.ap -= 1;
        this.calledShotActive = true;
        EventBridge.emit('log', `${mech.name} lines up a Called Shot — next attack +30% hit, +50% damage!`);
        this.requestAttack(mech);
        return;

      case 'repair': {
        // Find adjacent ally with lowest HP
        const allies = this.scene.playerMechs.filter(m =>
          m.alive && m !== mech &&
          Math.abs(m.row - mech.row) + Math.abs(m.col - mech.col) <= 1
        );
        const target = allies.length > 0
          ? allies.reduce((a, b) => a.hp < b.hp ? a : b)
          : mech;
        target.hp = Math.min(target.maxHp, target.hp + 20);
        mech.ap -= 2;
        EventBridge.emit('log', `${mech.name} repairs ${target.name} for 20 HP!`);
        EventBridge.emit('mechUpdated', target.getState());
        await target.playHealEffect();
        break;
      }

      case 'shield_bash': {
        this.selectedMech = mech;
        mech.ap -= 2;
        this.scene.showAttackHighlights(mech, 1);
        this.setPhase(PHASE.SPECIAL_SELECT);
        EventBridge.emit('log', 'Shield Bash ready — select an adjacent target!');
        return;
      }

      case 'barrage': {
        this.selectedMech = mech;
        mech.ap -= 2;
        this.scene.showAttackHighlights(mech, 6);
        this.setPhase(PHASE.SPECIAL_SELECT);
        EventBridge.emit('log', 'Missile Barrage ready — select a target tile!');
        return;
      }

      default:
        break;
    }

    this.selectedMech = mech;
    this.setPhase(PHASE.MECH_SELECTED);
    EventBridge.emit('mechSelected', mech.getState());
  }

  async executeSpecialAttack(attacker, target) {
    this.setPhase(PHASE.RESOLVING);
    this.scene.clearHighlights();

    if (attacker.special === 'barrage') {
      // Hit target + all adjacent tiles
      const targets = [target];
      const adjacent = this.scene.getAdjacentMechs(target.row, target.col, 'enemy');
      targets.push(...adjacent);

      for (const t of targets) {
        await this.scene.resolveCombat(attacker, t, 0, { damage: 8, isBarrage: true });
      }
      EventBridge.emit('log', `${attacker.name} launches Missile Barrage — ${targets.length} targets hit!`);
    } else if (attacker.special === 'shield_bash') {
      const result = await this.scene.resolveCombat(attacker, target, 1, { damageBonus: 8 });
      // Knockback
      const dr = target.row - attacker.row;
      const dc = target.col - attacker.col;
      const nr = target.row + dr;
      const nc = target.col + dc;
      if (this.scene.isValidAndEmpty(nr, nc)) {
        this.scene.grid[target.row][target.col].mech = null;
        target.row = nr;
        target.col = nc;
        this.scene.grid[nr][nc].mech = target;
        await target.moveTo(this.scene.tileX(nc), this.scene.tileY(nr));
      }
      EventBridge.emit('log', `${attacker.name} bashes ${target.name} back!`);
    }

    if (this.scene.checkGameOver()) return;

    this.selectedMech = attacker;
    this.setPhase(PHASE.MECH_SELECTED);
    this.scene.showMoveHighlights(attacker);
  }

  // ── End player turn ────────────────────────────────────────────────────────

  endPlayerTurn() {
    // Guard against double-calls (rapid clicks) and non-player states
    if (this.phase === PHASE.ENEMY_TURN ||
        this.phase === PHASE.MOVING ||
        this.phase === PHASE.RESOLVING ||
        this.phase === PHASE.GAME_OVER) return;
    this.deselectMech();
    this.setPhase(PHASE.ENEMY_TURN);
    EventBridge.emit('turnStart', { team: 'enemy', turn: this.turnNumber });

    // Slight delay before enemy AI fires
    this.scene.time.delayedCall(500, () => {
      this.scene.aiController.runEnemyTurn(() => {
        this.turnNumber += 1;
        if (!this.scene.checkGameOver()) {
          this.startPlayerTurn();
        }
      });
    });
  }
}
