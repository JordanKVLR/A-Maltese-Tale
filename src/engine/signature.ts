import type { Creature, Move } from "./types";
import { CRUX_AURA_STATUS_ID } from "./cruxAura";
import { getActiveEffect } from "./statusEffects";

/** How much harder a Crux-unleashed move hits. */
export const CRUX_UNLEASHED_MULTIPLIER = 1.5;

/** True when this move is the one the actor's active Crux Aura unleashes. */
export function isUnleashed(actor: Creature, move: Move): boolean {
  return !!actor.cruxMoveId && actor.cruxMoveId === move.id && !!getActiveEffect(actor, CRUX_AURA_STATUS_ID);
}

/** Moves that never miss: foresight signatures, and anything a Crux Aura has unleashed. */
export function alwaysHits(actor: Creature, move: Move): boolean {
  return move.signature === "foresight" || move.signature === "pierce" || isUnleashed(actor, move);
}

/** Valour: up to double power as the user's HP runs out. */
export function valourMultiplier(actor: Creature): number {
  const hpRatio = actor.currentHp / Math.max(1, actor.stats.hp);
  return 1 + Math.max(0, 1 - hpRatio);
}

/** The damage modifiers a move's signature (and an unleashed Crux) bring. */
export function signatureDamageOptions(actor: Creature, move: Move): {
  powerMultiplier: number;
  ignoreDefenseBoosts: boolean;
  minEffectiveness: number;
} {
  let powerMultiplier = 1;
  if (move.signature === "valour") powerMultiplier *= valourMultiplier(actor);
  if (isUnleashed(actor, move)) powerMultiplier *= CRUX_UNLEASHED_MULTIPLIER;
  return {
    powerMultiplier,
    ignoreDefenseBoosts: move.signature === "pierce" || isUnleashed(actor, move),
    minEffectiveness: move.signature === "solstice" ? 1 : 0,
  };
}

/**
 * The move a creature's Crux Aura unleashes: its signature move if it knows one, otherwise its
 * hardest-hitting attack.
 */
export function chooseCruxMove(moves: Move[]): string | undefined {
  const signature = moves.find((m) => m.signature);
  if (signature) return signature.id;
  const attacks = moves.filter((m) => m.category !== "status");
  attacks.sort((a, b) => b.power - a.power);
  return attacks[0]?.id;
}
