import { manhattanDistance } from './PathFinder.js';

/**
 * Resolve an attack from attacker to target using the given weapon.
 * Returns { hit, damage, heatGain, logMessage }
 */
export function resolveAttack(attacker, target, weapon, options = {}) {
  const { calledShot = false, flanking = false } = options;

  // Check range
  const dist = manhattanDistance(attacker.row, attacker.col, target.row, target.col);
  if (dist > weapon.range) {
    return { hit: false, damage: 0, heatGain: 0, logMessage: 'Out of range!' };
  }

  // Hit chance calculation
  let hitChance = weapon.hitChance;
  if (calledShot) hitChance = Math.min(1, hitChance + 0.3);

  // Roll for hit
  const roll = Math.random();
  if (roll > hitChance) {
    return {
      hit: false,
      damage: 0,
      heatGain: Math.floor(weapon.heat * 0.5), // still generate some heat on miss
      logMessage: `${attacker.name} fires ${weapon.name} — MISS! (${Math.round(hitChance * 100)}% chance)`,
    };
  }

  // Determine armor zone (rear if flanking or approaching from behind)
  const armorValue = flanking ? target.rearArmor : target.frontArmor;

  // Calculate damage (armor reduces incoming damage)
  const armorReduction = Math.floor(armorValue * 0.2); // Armor absorbs ~20% as flat reduction
  let damage = Math.max(1, weapon.damage - armorReduction);
  if (calledShot) damage = Math.floor(damage * 1.5);

  return {
    hit: true,
    damage,
    heatGain: weapon.heat,
    flanking,
    logMessage: `${attacker.name} fires ${weapon.name} — HIT! ${damage} damage${flanking ? ' (flanked!)' : ''}`,
  };
}

/**
 * Determine if the attacker is flanking the target
 * (attacking from the opposite side of where the target faces).
 */
export function isFlanking(attacker, target) {
  const dc = attacker.col - target.col;
  const dr = attacker.row - target.row;

  // Target faces toward the enemy team
  if (target.team === 'player') {
    // Player mechs face right (toward higher cols) — flanked from the right
    return dc > 0;
  } else {
    // Enemy mechs face left (toward lower cols) — flanked from the left
    return dc < 0;
  }
}

/**
 * Apply damage to a mech. Returns true if the mech died.
 */
export function applyDamage(mech, damage, flanking = false) {
  // Reduce armor first
  if (flanking) {
    const armorDamage = Math.min(damage, mech.rearArmor);
    mech.rearArmor -= armorDamage;
    damage -= armorDamage;
  } else {
    const armorDamage = Math.min(damage, mech.frontArmor);
    mech.frontArmor -= armorDamage;
    damage -= armorDamage;
  }

  // Remaining damage hits HP
  mech.hp = Math.max(0, mech.hp - damage);
  return mech.hp <= 0;
}

/**
 * Apply heat to a mech. Returns true if heat overflow triggered (skip next attack).
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
 * Cool down a mech at the start of its turn (reduce heat by 25%).
 */
export function coolDown(mech) {
  mech.heat = Math.max(0, mech.heat - 25);
  if (mech.heat < mech.maxHeat) {
    mech.overheated = false;
  }
}
