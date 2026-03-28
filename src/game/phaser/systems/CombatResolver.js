import { TILE_WALL } from '../../config.js';
import { manhattanDistance, hasLineOfSight } from './PathFinder.js';

/**
 * Resolve an attack from attacker to target using the given weapon.
 * Returns { hit, damage, heatGain, isCrit, logMessage }
 *
 * Options:
 *   calledShot  – +30% hit, +50% damage
 *   flanking    – attacker is behind the target's facing
 *   grid        – if provided, blocks shots through walls (LoS + cover)
 */
export function resolveAttack(attacker, target, weapon, options = {}) {
  const { calledShot = false, flanking = false, grid = null } = options;

  // Range check
  const dist = manhattanDistance(attacker.row, attacker.col, target.row, target.col);
  if (dist > weapon.range) {
    return { hit: false, damage: 0, heatGain: 0, isCrit: false, logMessage: 'Out of range!' };
  }

  // Line of Sight — block shots that pass through walls
  if (grid && !hasLineOfSight(grid, attacker.row, attacker.col, target.row, target.col)) {
    return {
      hit: false, damage: 0, heatGain: 0, isCrit: false,
      logMessage: `${attacker.name} fires ${weapon.name} — BLOCKED by wall!`,
    };
  }

  // Cover — wall adjacent to target on attacker's side reduces hit chance
  const coverReduction = grid ? getCoverBonus(grid, attacker, target) : 0;

  // Hit chance
  let hitChance = weapon.hitChance;
  if (calledShot) hitChance = Math.min(1, hitChance + 0.3);
  hitChance = Math.max(0.05, hitChance - coverReduction);

  const roll = Math.random();
  if (roll > hitChance) {
    const coverNote = coverReduction > 0 ? ' (in cover)' : '';
    return {
      hit: false,
      damage: 0,
      heatGain: Math.floor(weapon.heat * 0.5),
      isCrit: false,
      logMessage: `${attacker.name} fires ${weapon.name} — MISS!${coverNote} (${Math.round(hitChance * 100)}%)`,
    };
  }

  // Critical hit: roll ≤ 20% of base hit chance → 2× damage
  const isCrit = roll <= weapon.hitChance * 0.2;

  let damage = weapon.damage;
  if (calledShot) damage = Math.floor(damage * 1.5);
  if (isCrit) damage = Math.floor(damage * 2);

  const tags = [];
  if (isCrit)    tags.push('CRITICAL!');
  if (flanking)  tags.push('flanked');
  if (coverReduction > 0) tags.push('partial cover');
  const tagStr = tags.length ? ` [${tags.join(' | ')}]` : '';

  return {
    hit: true,
    damage,
    heatGain: weapon.heat,
    flanking,
    isCrit,
    logMessage: `${attacker.name} fires ${weapon.name} — HIT! ${damage} dmg${tagStr}`,
  };
}

/**
 * Determine if the attacker is flanking the target.
 * Uses the target's explicit `facing` property if set,
 * otherwise falls back to team-based assumption.
 *
 * Flanking = attacking from behind (opposite of where target faces).
 */
export function isFlanking(attacker, target) {
  const facing = target.facing || (target.team === 'player' ? 'E' : 'W');
  switch (facing) {
    case 'E': return attacker.col < target.col;  // behind an east-facing mech = from west
    case 'W': return attacker.col > target.col;  // behind a west-facing mech = from east
    case 'N': return attacker.row > target.row;  // behind a north-facing mech = from south
    case 'S': return attacker.row < target.row;  // behind a south-facing mech = from north
    default:  return false;
  }
}

/**
 * Cover bonus: returns a hit-chance reduction (0–0.25) when the target has
 * a wall adjacent to them on the side facing the attacker.
 */
export function getCoverBonus(grid, attacker, target) {
  // Direction from target toward attacker (dominant axis)
  const dr = attacker.row - target.row;
  const dc = attacker.col - target.col;

  let coverRow, coverCol;
  if (Math.abs(dr) >= Math.abs(dc)) {
    coverRow = target.row + Math.sign(dr);
    coverCol = target.col;
  } else {
    coverRow = target.row;
    coverCol = target.col + Math.sign(dc);
  }

  if (coverRow < 0 || coverRow >= grid.length)    return 0;
  if (coverCol < 0 || coverCol >= grid[0].length) return 0;

  const tile = grid[coverRow][coverCol];
  return tile && tile.type === TILE_WALL ? 0.25 : 0;
}

/**
 * Apply damage to a mech. Armor absorbs first; overflow hits HP.
 * Returns true if the mech died.
 */
export function applyDamage(mech, damage, flanking = false) {
  if (flanking) {
    const absorbed = Math.min(damage, mech.rearArmor);
    mech.rearArmor -= absorbed;
    damage -= absorbed;
  } else {
    const absorbed = Math.min(damage, mech.frontArmor);
    mech.frontArmor -= absorbed;
    damage -= absorbed;
  }
  mech.hp = Math.max(0, mech.hp - damage);
  return mech.hp <= 0;
}

/**
 * Apply heat to a mech. Returns true if overheated this tick.
 */
export function applyHeat(mech, heatGain) {
  mech.heat = Math.min(mech.maxHeat, mech.heat + heatGain);
  if (mech.heat >= mech.maxHeat) {
    mech.heat = mech.maxHeat;
    mech.overheated = true;
    return true;
  }
  return false;
}

/**
 * Cool down a mech at the start of its turn (25% of maxHeat per turn).
 */
export function coolDown(mech) {
  mech.heat = Math.max(0, mech.heat - Math.ceil(mech.maxHeat * 0.25));
  if (mech.heat < mech.maxHeat) mech.overheated = false;
}
