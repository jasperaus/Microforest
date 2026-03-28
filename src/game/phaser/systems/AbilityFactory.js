import abilitiesData from '../../data/abilities.json';
import { PHASE } from '../../config.js';
import EventBridge from '../EventBridge.js';

/**
 * AbilityFactory: data-driven ability execution.
 *
 * Each ability entry in abilities.json has an `effect` field that maps to
 * one of the handlers below. New abilities can be added by extending the
 * JSON without touching this file — unless a genuinely new effect type
 * is needed.
 */

const abilitiesMap = {};
abilitiesData.forEach(a => { abilitiesMap[a.id] = a; });

/**
 * Execute an ability by id.
 *
 * @param {string}      abilityId   — matches `id` in abilities.json
 * @param {Mech}        mech        — the acting mech
 * @param {TurnManager} turnManager — for phase changes / requestAttack
 * @param {BattleScene} scene       — for access to mechs and highlights
 * @returns {Promise<void>}
 */
export async function executeAbility(abilityId, mech, turnManager, scene) {
  const ability = abilitiesMap[abilityId];
  if (!ability) {
    console.warn(`AbilityFactory: unknown ability id "${abilityId}"`);
    return;
  }

  switch (ability.effect) {

    case 'stealth':
      mech.stealthed = true;
      mech.ap -= ability.apCost;
      EventBridge.emit('log', `${mech.name} activates ${ability.name} — invisible for 1 round!`);
      await mech.playStealthEffect();
      break;

    case 'called_shot':
      mech.calledShot = true;
      mech.ap -= ability.apCost;
      EventBridge.emit('log', `${mech.name} lines up a Called Shot — +30% hit, +50% damage!`);
      turnManager.requestAttack(mech);
      return; // already transitioned phase; don't fall through to MECH_SELECTED

    case 'heal': {
      const healAmt = ability.healAmount || 20;
      const allies = scene.playerMechs.filter(m =>
        m.alive && m !== mech &&
        Math.abs(m.row - mech.row) + Math.abs(m.col - mech.col) <= 1
      );
      const healTarget = allies.length > 0
        ? allies.reduce((a, b) => a.hp < b.hp ? a : b)
        : mech;
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmt);
      mech.ap -= ability.apCost;
      EventBridge.emit('log', `${mech.name} repairs ${healTarget.name} for ${healAmt} HP!`);
      EventBridge.emit('mechUpdated', healTarget.getState());
      await healTarget.playHealEffect();
      break;
    }

    case 'melee_knockback':
      // Deduct AP, show target highlights, then wait for the player to click
      mech.ap -= ability.apCost;
      scene.showAttackHighlights(mech, ability.range);
      turnManager.setPhase(PHASE.SPECIAL_SELECT);
      EventBridge.emit('log', `${ability.name} ready — select an adjacent target!`);
      return;

    case 'aoe_attack':
      mech.ap -= ability.apCost;
      scene.showAttackHighlights(mech, ability.range);
      turnManager.setPhase(PHASE.SPECIAL_SELECT);
      EventBridge.emit('log', `${ability.name} ready — select a target!`);
      return;

    default:
      console.warn(`AbilityFactory: unhandled effect type "${ability.effect}"`);
      break;
  }

  // Return mech to selected state
  turnManager.selectedMech = mech;
  turnManager.setPhase(PHASE.MECH_SELECTED);
  EventBridge.emit('mechSelected', mech.getState());
}

/** Return the raw ability data object (or null). */
export function getAbility(id) {
  return abilitiesMap[id] || null;
}
