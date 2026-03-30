import { getFacingFromMovement } from '../../config.js';
import { findPath, hexDistance, hasLineOfSight } from './PathFinder.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat, coolDown } from './CombatResolver.js';
import EventBridge from '../EventBridge.js';
import { safeAnim } from '../../r3f/animUtils.js';

const AI_DELAY = 600; // ms between AI actions

/**
 * AIController: drives enemy mech behaviour each turn.
 * Works with either a Phaser BattleScene (legacy) or a plain GameContext object.
 */
export default class AIController {
  constructor(ctx) {
    this.ctx = ctx;
    // Legacy alias
    this.scene = ctx;
  }

  runEnemyTurn(onComplete) {
    const enemies = this.ctx.enemyMechs.filter(m => m.alive);

    enemies.forEach(m => {
      m.ap = m.maxAp;
      coolDown(m);
    });

    let finished = false;
    const finish = () => { if (!finished) { finished = true; onComplete(); } };

    // Failsafe: if entire enemy turn exceeds 12 s, force-complete it
    const watchdog = this.ctx.time.delayedCall(12000, () => {
      console.warn('AIController: enemy turn watchdog fired — forcing turn end');
      finish();
    });

    this._runNextEnemy([...enemies], () => {
      watchdog.remove(false);
      finish();
    });
  }

  _runNextEnemy(remaining, onComplete) {
    if (remaining.length === 0) {
      onComplete();
      return;
    }

    const enemy = remaining.shift();
    this.ctx.time.delayedCall(AI_DELAY, () => {
      const next = () => this._runNextEnemy(remaining, onComplete);
      this._actEnemy(enemy, next);
    });
  }

  async _actEnemy(enemy, onDone) {
    try {
      if (!enemy.alive) return;

      const players = this.ctx.playerMechs.filter(m => m.alive && !m.stealthed);
      if (players.length === 0) return;

      const target = players.reduce((best, p) => {
        const d  = hexDistance(enemy.row, enemy.col, p.row, p.col);
        const bd = hexDistance(enemy.row, enemy.col, best.row, best.col);
        return d < bd ? p : best;
      });

      const weaponData = this.ctx.getWeapon(enemy, 0);
      if (!weaponData) return;

      const dist = hexDistance(enemy.row, enemy.col, target.row, target.col);

      // === Move phase ===
      if (enemy.ap > 0 && dist > weaponData.range) {
        const otherMechs = [
          ...this.ctx.playerMechs.filter(m => m.alive && !m.stealthed),
          ...this.ctx.enemyMechs.filter(m => m.alive && m !== enemy),
        ];
        const path = findPath(
          this.ctx.grid,
          enemy.row, enemy.col,
          target.row, target.col,
          otherMechs
        );

        if (path.length > 0) {
          const destIndex = Math.min(enemy.speed - 1, path.length - 2);
          if (destIndex >= 0) {
            const dest = path[destIndex];
            if (dest && this.ctx.grid[dest.row][dest.col].mech === null) {
              const fromRow = enemy.row;
              const fromCol = enemy.col;

              this.ctx.grid[enemy.row][enemy.col].mech = null;
              enemy.row = dest.row;
              enemy.col = dest.col;
              this.ctx.grid[dest.row][dest.col].mech = enemy;

              enemy.setFacing(getFacingFromMovement(fromRow, fromCol, dest.row, dest.col));

              const [x, z] = this.ctx.tileXZ(dest.col, dest.row);
              const anim = this.ctx.getMechAnim(enemy.id);
              if (anim) await safeAnim(anim.moveTo(x, z));
              enemy.ap -= 1;
            }
          }
        }
      }

      // === Attack phase ===
      const newDist = hexDistance(enemy.row, enemy.col, target.row, target.col);
      const hasLoS  = hasLineOfSight(
        this.ctx.grid,
        enemy.row, enemy.col,
        target.row, target.col
      );

      if (enemy.ap > 0 && newDist <= weaponData.range && !enemy.overheated && hasLoS) {
        const flanking = isFlanking(enemy, target);
        const result   = resolveAttack(enemy, target, weaponData, {
          flanking,
          grid: this.ctx.grid,
        });

        enemy.ap -= 1;
        const justOverheated = applyHeat(enemy, result.heatGain);

        if (result.hit) {
          const prevFrontArmor = target.frontArmor;
          const prevRearArmor  = target.rearArmor;
          const died = applyDamage(target, result.damage, flanking);

          const armorBroken = flanking
            ? (prevRearArmor > 0 && target.rearArmor <= 0)
            : (prevFrontArmor > 0 && target.frontArmor <= 0);

          const targetAnim = this.ctx.getMechAnim(target.id);
          if (targetAnim) {
            await safeAnim(targetAnim.playHitEffect(result.damage, { isCrit: result.isCrit, armorBroken }));
          }

          if (died) {
            target.alive = false;
            if (targetAnim) await safeAnim(targetAnim.playDeathEffect());
            this.ctx.shakeCamera(200, 0.012);
            this.ctx.grid[target.row][target.col].mech = null;
            if (target.team === 'player') this.ctx.stats.mechsLost++;
            EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
          } else {
            if (result.damage >= 15) this.ctx.shakeCamera(100, 0.006);
            if (justOverheated) {
              const enemyAnim = this.ctx.getMechAnim(enemy.id);
              if (enemyAnim) await safeAnim(enemyAnim.playOverheatEffect());
            }
          }
        } else {
          const targetAnim = this.ctx.getMechAnim(target.id);
          if (targetAnim) await safeAnim(targetAnim.playMissEffect());
        }

        EventBridge.emit('log', result.logMessage);
        EventBridge.emit('mechUpdated', target.getState());
      }
    } catch (err) {
      console.error(`AI error for ${enemy?.id}:`, err);
    } finally {
      onDone();
    }
  }
}
