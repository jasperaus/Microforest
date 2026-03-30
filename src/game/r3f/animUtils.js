/**
 * animUtils — shared animation helpers for R3F mech animations.
 * safeAnim races an animation Promise against a timeout so a broken
 * callback can never hang the AI turn or player actions indefinitely.
 */

/** Race animation promise against a timeout. */
export const safeAnim = (p, ms = 1800) =>
  Promise.race([p, new Promise(r => setTimeout(r, ms))]);

/**
 * Lerp a value toward a target.
 * @param {number} current
 * @param {number} target
 * @param {number} t  — 0..1
 */
export function lerp(current, target, t) {
  return current + (target - current) * t;
}

/**
 * Ease in-out sine: maps t (0..1) → 0..1 with smooth start/end.
 */
export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
