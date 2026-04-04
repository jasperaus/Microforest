import { PHASE, getFacingFromMovement } from '../../config.js';
import { coolDown } from './CombatResolver.js';
import { executeAbility, getAbility } from './AbilityFactory.js';
import EventBridge from '../EventBridge.js';
import { safeAnim } from '../../r3f/animUtils.js';

/**
 * TurnManager: controls the player/enemy turn cycle and game phase state machine.
 * Works with either a Phaser BattleScene (legacy) or a plain GameContext object.
 */
export default class TurnManager {
  constructor(ctx) {
    this.ctx = ctx;
    // Legacy alias so old scene-passing code still works
    this.scene = ctx;
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

    this.ctx.playerMechs.forEach(m => {
      if (!m.alive) return;
      m.ap = m.maxAp;
      m.activatedThisTurn = false;
      m.stealthed = false;
      m.calledShot = false;
      coolDown(m);
    });

    EventBridge.emit('turnStart', {
      team: 'player',
      turn: this.turnNumber,
      mechs: this.ctx.playerMechs.filter(m => m.alive).map(m => m.getState()),
      enemyMechs: this.ctx.enemyMechs.filter(m => m.alive).map(m => m.getState()),
    });
  }

  // ── Mech selection ─────────────────────────────────────────────────────────

  selectMech(mech) {
    if (this.phase === PHASE.MOVING || this.phase === PHASE.RESOLVING) return;
    if (mech.team !== 'player') return;
    if (!mech.alive) return;
    if (mech.ap <= 0) return;

    this.selectedMech = mech;
    this.ctx.clearHighlights();
    this.ctx.showMoveHighlights(mech);
    this.setPhase(PHASE.MECH_SELECTED);

    EventBridge.emit('mechSelected', mech.getState());
  }

  deselectMech() {
    this.selectedMech = null;
    this.ctx.clearHighlights();
    this.setPhase(PHASE.IDLE);
    EventBridge.emit('mechDeselected', null);
  }

  // ── Move action ────────────────────────────────────────────────────────────

  requestMove(mech) {
    if (!mech || mech.ap < 1 || this.phase === PHASE.MOVING) return;
    this.ctx.clearHighlights();
    this.ctx.showMoveHighlights(mech);
    this.setPhase(PHASE.MECH_SELECTED);
  }

  async executeMove(mech, targetRow, targetCol) {
    if (!mech || mech.ap < 1) return;
    if (this.phase !== PHASE.MECH_SELECTED) return;

    this.setPhase(PHASE.MOVING);
    this.ctx.clearHighlights();

    const fromRow = mech.row;
    const fromCol = mech.col;

    this.ctx.grid[mech.row][mech.col].mech = null;
    mech.row = targetRow;
    mech.col = targetCol;
    this.ctx.grid[targetRow][targetCol].mech = mech;

    mech.setFacing(getFacingFromMovement(fromRow, fromCol, targetRow, targetCol));

    const [x, z] = this.ctx.tileXZ(targetCol, targetRow);
    const anim = this.ctx.getMechAnim(mech.id);
    if (anim) await safeAnim(anim.moveTo(x, z));

    mech.ap -= 1;
    mech.activatedThisTurn = true;

    EventBridge.emit('mechMoved', mech.getState());

    this.selectedMech = mech;
    this.setPhase(PHASE.MECH_SELECTED);
    this.ctx.showMoveHighlights(mech);
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
    this.ctx.clearHighlights();
    this.ctx.showAttackHighlights(mech);
    this.setPhase(PHASE.ATTACK_SELECT);
  }

  async executeAttack(attacker, target, weaponIndex = 0) {
    if (this.phase !== PHASE.ATTACK_SELECT) return;
    if (!attacker || !target) return;
    if (attacker.ap < 1) return;

    this.setPhase(PHASE.RESOLVING);
    this.ctx.clearHighlights();

    const options = { calledShot: attacker.calledShot || false };
    attacker.calledShot = false;
    this.calledShotActive = false;

    const result = await this.ctx.resolveCombat(attacker, target, weaponIndex, options);
    attacker.ap -= 1;
    attacker.activatedThisTurn = true;

    EventBridge.emit('combatResult', { attacker: attacker.getState(), target: target.getState(), result });
    EventBridge.emit('log', result.logMessage);

    if (this.ctx.checkGameOver()) return;

    this.selectedMech = attacker;
    this.setPhase(PHASE.MECH_SELECTED);
    this.ctx.showMoveHighlights(attacker);
  }

  // ── Special action ─────────────────────────────────────────────────────────

  requestSpecial(mech) {
    if (!mech || mech.special === 'none') return;

    const ability = getAbility(mech.special);
    const baseCost = ability ? ability.apCost : 2;
    const apRequired = (ability && ability.effect === 'called_shot') ? baseCost + 1 : baseCost;
    if (mech.ap < apRequired) {
      EventBridge.emit('log', `${mech.name}: not enough AP for ${mech.specialName || 'special'}!`);
      return;
    }

    this.selectedMech = mech;
    this.executeSpecial(mech);
  }

  async executeSpecial(mech) {
    await executeAbility(mech.special, mech, this, this.ctx);
  }

  async executeSpecialAttack(attacker, target) {
    this.setPhase(PHASE.RESOLVING);
    this.ctx.clearHighlights();

    const ability = getAbility(attacker.special);

    if (attacker.special === 'barrage') {
      const opposingTeam = attacker.team === 'player' ? 'enemy' : 'player';
      const splashTargets = this.ctx.getAdjacentMechs(target.row, target.col, opposingTeam);
      const allTargets = [target, ...splashTargets.filter(m => m !== target)];
      const damage = ability ? ability.damage : 8;

      await Promise.all(
        allTargets.map(t => this.ctx.resolveCombat(attacker, t, 0, { damage, isBarrage: true }))
      );
      EventBridge.emit('log',
        `${attacker.name} launches Missile Barrage — ${allTargets.length} target(s) hit!`
      );

    } else if (attacker.special === 'shield_bash') {
      const damageBonus = ability ? ability.damageBonus : 8;
      const weaponIndex = ability ? (ability.weaponIndex || 1) : 1;
      await this.ctx.resolveCombat(attacker, target, weaponIndex, { damageBonus });

      const dr = Math.sign(target.row - attacker.row);
      const dc = Math.sign(target.col - attacker.col);
      const nr = target.row + dr;
      const nc = target.col + dc;
      if (this.ctx.isValidAndEmpty(nr, nc)) {
        this.ctx.grid[target.row][target.col].mech = null;
        target.row = nr;
        target.col = nc;
        this.ctx.grid[nr][nc].mech = target;
        const [x, z] = this.ctx.tileXZ(nc, nr);
        const anim = this.ctx.getMechAnim(target.id);
        if (anim) await safeAnim(anim.moveTo(x, z));
      }
      EventBridge.emit('log', `${attacker.name} bashes ${target.name} back!`);
    }

    if (this.ctx.checkGameOver()) return;

    this.selectedMech = attacker;
    this.setPhase(PHASE.MECH_SELECTED);
    this.ctx.showMoveHighlights(attacker);
  }

  // ── End player turn ────────────────────────────────────────────────────────

  endPlayerTurn() {
    if (this.phase === PHASE.ENEMY_TURN ||
        this.phase === PHASE.MOVING ||
        this.phase === PHASE.RESOLVING ||
        this.phase === PHASE.GAME_OVER) return;
    this.deselectMech();
    this.setPhase(PHASE.ENEMY_TURN);
    EventBridge.emit('turnStart', { team: 'enemy', turn: this.turnNumber });

    const delay = this.ctx.time?.delayedCall ?? ((ms, cb) => { setTimeout(cb, ms); return {}; });
    delay(500, () => {
      // Guard: if AI controller is missing, skip directly to next player turn
      if (!this.ctx.aiController) {
        console.warn('TurnManager: aiController not found — skipping enemy turn');
        this.turnNumber += 1;
        this.startPlayerTurn();
        return;
      }
      try {
        this.ctx.aiController.runEnemyTurn(() => {
          try {
            this.turnNumber += 1;
            if (!this.ctx.checkGameOver()) {
              this.startPlayerTurn();
            }
          } catch (err) {
            console.error('TurnManager: error resuming player turn after enemy turn:', err);
            // Attempt recovery so the game doesn't freeze
            this.setPhase(PHASE.IDLE);
            this.startPlayerTurn();
          }
        });
      } catch (err) {
        console.error('TurnManager: error during enemy turn — forcing player turn:', err);
        this.turnNumber += 1;
        this.startPlayerTurn();
      }
    });
  }
}
