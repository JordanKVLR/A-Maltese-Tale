import type { Creature } from "./types";
import { isCruxOnCooldown } from "./cruxAura";

/**
 * The Crux meter. A creature's resonance with the islands' old stones builds as it fights —
 * landing blows, and more so taking them — and only a full meter can be released as a Crux
 * Aura. It starts every battle empty, and empties again when the aura is invoked.
 */

export const CRUX_FULL = 100;
/** Charge for landing a hit; a super-effective hit rings louder. */
export const CHARGE_FOR_HIT = 12;
export const CHARGE_FOR_SUPER_EFFECTIVE = 8;
/** Charge for taking damage, per 1% of max HP lost. */
export const CHARGE_PER_PERCENT_TAKEN = 1.1;
/** A little for any hit taken at all, so chip damage still counts. */
export const CHARGE_FOR_BEING_HIT = 4;

export function cruxCharge(creature: Creature): number {
  return creature.cruxCharge ?? 0;
}

function add(creature: Creature, amount: number) {
  // No charging while the aura burns or while it is spent: the meter is for the next one.
  if (isCruxOnCooldown(creature)) return;
  creature.cruxCharge = Math.max(0, Math.min(CRUX_FULL, cruxCharge(creature) + amount));
}

/** Charges both sides after a damaging hit lands. */
export function chargeFromHit(attacker: Creature, target: Creature, damage: number, effectiveness: number): void {
  if (damage <= 0) return;
  add(attacker, CHARGE_FOR_HIT + (effectiveness > 1 ? CHARGE_FOR_SUPER_EFFECTIVE : 0));
  const percent = (damage / Math.max(1, target.stats.hp)) * 100;
  add(target, CHARGE_FOR_BEING_HIT + percent * CHARGE_PER_PERCENT_TAKEN);
}

export function cruxReady(creature: Creature): boolean {
  return cruxCharge(creature) >= CRUX_FULL && !isCruxOnCooldown(creature);
}

/** Spends the meter as the aura is invoked. */
export function spendCrux(creature: Creature): void {
  creature.cruxCharge = 0;
}
