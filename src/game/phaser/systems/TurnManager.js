import { PHASE, getFacingFromMovement } from '../../config.js';
import { coolDown } from './CombatResolver.js';
import { executeAbility, getAbility } from './AbilityFactory.js';
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
      m.stealthed = false;   // stealth lasts exactly 1 enemy turn
      m.calledShot = false;  // expire called shot if it was never used
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
    // Bug fix: don't enter MECH_SELECTED with zero AP — highlights would be empty
    if (mech.ap <= 0) return;

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

    const fromRow = mech.row;
    const fromCol = mech.col;

    // Update grid tracking
    this.scene.grid[mech.row][mech.col].mech = null;
    mech.row = targetRow;
    mech.col = targetCol;
    this.scene.grid[targetRow][targetCol].mech = mech;

    // Update facing based on movement direction
    mech.setFacing(getFacingFromMovement(fromRow, fromCol, targetRow, targetCol));

    // Animate movement
    await mech.moveTo(
      this.scene.tileX(targetCol, targetRow),
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
    if (!mech || mech.special === 'none') return;

    const ability = getAbility(mech.special);
    // called_shot costs its own AP *plus* 1 for the subsequent attack
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
    // Delegate entirely to the data-driven AbilityFactory
    await executeAbility(mech.special, mech, this, this.scene);
  }

  async executeSpecialAttack(attacker, target) {
    this.setPhase(PHASE.RESOLVING);
    this.scene.clearHighlights();

    const ability = getAbility(attacker.special);

    if (attacker.special === 'barrage') {
      // Hit primary target + all adjacent mechs of the opposing team
      const opposingTeam = attacker.team === 'player' ? 'enemy' : 'player';
      const splashTargets = this.scene.getAdjacentMechs(target.row, target.col, opposingTeam);
      const allTargets = [target, ...splashTargets.filter(m => m !== target)];

      const damage = ability ? ability.damage : 8;

      // Fire all animations concurrently for cinematic feel
      await Promise.all(
        allTargets.map(t => this.scene.resolveCombat(attacker, t, 0, { damage, isBarrage: true }))
      );
      EventBridge.emit('log',
        `${attacker.name} launches Missile Barrage — ${allTargets.length} target(s) hit!`
      );

    } else if (attacker.special === 'shield_bash') {
      const damageBonus = ability ? ability.damageBonus : 8;
      const weaponIndex = ability ? (ability.weaponIndex || 1) : 1;
      await this.scene.resolveCombat(attacker, target, weaponIndex, { damageBonus });

      // Knockback: unit vector so distance is always exactly 1 tile
      const dr = Math.sign(target.row - attacker.row);
      const dc = Math.sign(target.col - attacker.col);
      const nr = target.row + dr;
      const nc = target.col + dc;
      if (this.scene.isValidAndEmpty(nr, nc)) {
        this.scene.grid[target.row][target.col].mech = null;
        target.row = nr;
        target.col = nc;
        this.scene.grid[nr][nc].mech = target;
        await target.moveTo(this.scene.tileX(nc, nr), this.scene.tileY(nr));
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
