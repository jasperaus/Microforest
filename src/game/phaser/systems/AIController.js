import { getReachableTiles, findPath, manhattanDistance } from './PathFinder.js';
import { resolveAttack, isFlanking, applyDamage, applyHeat, coolDown } from './CombatResolver.js';
import EventBridge from '../EventBridge.js';

const AI_DELAY = 600; // ms between AI actions

/**
 * AIController: drives enemy mech behavior each turn.
 * Behavior: move toward nearest player mech, attack if in range.
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
      this._actEnemy(enemy, () => {
        this._runNextEnemy(remaining, onComplete);
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
    const dist = manhattanDistance(enemy.row, enemy.col, target.row, target.col);

    // === Move phase ===
    if (enemy.ap > 0) {
      if (dist > weaponData.range) {
        // Move toward target
        const otherMechs = [
          ...this.scene.playerMechs.filter(m => m.alive),
          ...this.scene.enemyMechs.filter(m => m.alive && m !== enemy),
        ];
        const path = findPath(
          this.scene.grid,
          enemy.row, enemy.col,
          target.row, target.col,
          otherMechs
        );

        if (path.length > 0) {
          // Move up to `speed` tiles along path
          const stepsToTake = Math.min(enemy.speed, path.length - 1);
          if (stepsToTake > 0) {
            const dest = path[stepsToTake];
            if (this.scene.grid[dest.row][dest.col].mech === null) {
              this.scene.grid[enemy.row][enemy.col].mech = null;
              enemy.row = dest.row;
              enemy.col = dest.col;
              this.scene.grid[dest.row][dest.col].mech = enemy;

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
    if (enemy.ap > 0 && newDist <= weaponData.range && !enemy.overheated) {
      const flanking = isFlanking(enemy, target);
      const result = resolveAttack(enemy, target, weaponData, { flanking });

      enemy.ap -= 1;
      applyHeat(enemy, result.heatGain);

      if (result.hit) {
        const died = applyDamage(target, result.damage, flanking);
        await target.playHitEffect(result.damage);
        if (died) {
          target.alive = false;
          await target.playDeathEffect();
          this.scene.grid[target.row][target.col].mech = null;
          EventBridge.emit('mechKilled', { mechId: target.id, team: target.team });
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
