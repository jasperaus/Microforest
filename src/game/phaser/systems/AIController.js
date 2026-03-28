import { getFacingFromMovement } from '../../config.js';
import { findPath, manhattanDistance, hasLineOfSight } from './PathFinder.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat, coolDown } from './CombatResolver.js';
import EventBridge from '../EventBridge.js';

const AI_DELAY = 600; // ms between AI actions

/**
 * AIController: drives enemy mech behavior each turn.
 * Behavior: move toward nearest player mech, attack if in range + LoS.
 */
export default class AIController {
  constructor(scene) {
    this.scene = scene;
  }

  runEnemyTurn(onComplete) {
    const enemies = this.scene.enemyMechs.filter(m => m.alive);

    // Reset AP and cool down
    enemies.forEach(m => {
      m.ap = m.maxAp;
      coolDown(m);
    });

    this._runNextEnemy([...enemies], onComplete);
  }

  _runNextEnemy(remaining, onComplete) {
    if (remaining.length === 0) {
      onComplete();
      return;
    }

    const enemy = remaining.shift();
    this.scene.time.delayedCall(AI_DELAY, () => {
      const next = () => this._runNextEnemy(remaining, onComplete);
      // Always advance even if this enemy's turn throws an error
      this._actEnemy(enemy, next).catch(err => {
        console.warn('AI action error (continuing):', err);
        next();
      });
    });
  }

  async _actEnemy(enemy, onDone) {
    if (!enemy.alive) { onDone(); return; }

    const players = this.scene.playerMechs.filter(m => m.alive && !m.stealthed);
    if (players.length === 0) { onDone(); return; }

    // Find nearest player mech
    const target = players.reduce((best, p) => {
      const d = manhattanDistance(enemy.row, enemy.col, p.row, p.col);
      const bd = manhattanDistance(enemy.row, enemy.col, best.row, best.col);
      return d < bd ? p : best;
    });

    const weaponData = this.scene.getWeapon(enemy, 0);
    if (!weaponData) { onDone(); return; }

    const dist = manhattanDistance(enemy.row, enemy.col, target.row, target.col);

    // === Move phase ===
    if (enemy.ap > 0) {
      if (dist > weaponData.range) {
        // Move toward target
        const otherMechs = [
          ...this.scene.playerMechs.filter(m => m.alive && !m.stealthed),
          ...this.scene.enemyMechs.filter(m => m.alive && m !== enemy),
        ];
        const path = findPath(
          this.scene.grid,
          enemy.row, enemy.col,
          target.row, target.col,
          otherMechs
        );

        if (path.length > 0) {
          // Move up to speed tiles, stopping before the occupied goal tile
          const destIndex = Math.min(enemy.speed - 1, path.length - 2);
          if (destIndex >= 0) {
            const dest = path[destIndex];
            if (dest && this.scene.grid[dest.row][dest.col].mech === null) {
              const fromRow = enemy.row;
              const fromCol = enemy.col;

              this.scene.grid[enemy.row][enemy.col].mech = null;
              enemy.row = dest.row;
              enemy.col = dest.col;
              this.scene.grid[dest.row][dest.col].mech = enemy;

              // Update facing direction after movement
              enemy.setFacing(getFacingFromMovement(fromRow, fromCol, dest.row, dest.col));

              await enemy.moveTo(
                this.scene.tileX(dest.col),
                this.scene.tileY(dest.row)
              );
              enemy.ap -= 1;
            }
          }
        }
      }
    }

    // === Attack phase ===
    const newDist = manhattanDistance(enemy.row, enemy.col, target.row, target.col);

    // Check line of sight before committing to an attack
    const hasLoS = hasLineOfSight(
      this.scene.grid,
      enemy.row, enemy.col,
      target.row, target.col
    );

    if (enemy.ap > 0 && newDist <= weaponData.range && !enemy.overheated && hasLoS) {
      const flanking = isFlanking(enemy, target);
      const result = resolveAttack(enemy, target, weaponData, {
        flanking,
        grid: this.scene.grid,
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

        await target.playHitEffect(result.damage, { isCrit: result.isCrit, armorBroken });

        if (died) {
          target.alive = false;
          await target.playDeathEffect();
          this.scene.cameras.main.shake(200, 0.012);
          this.scene.grid[target.row][target.col].mech = null;
          if (target.team === 'player') this.scene.stats.mechsLost++;
          EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
        } else {
          if (result.damage >= 15) this.scene.cameras.main.shake(100, 0.006);
          if (justOverheated) await enemy.playOverheatEffect();
        }
      } else {
        await target.playMissEffect();
      }

      EventBridge.emit('log', result.logMessage);
      EventBridge.emit('mechUpdated', target.getState());
    }

    onDone();
  }
}
