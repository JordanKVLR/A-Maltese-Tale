import type { StatBlock } from "../data/schemas";

/** Species base stats (starters.json's baseStatsFinal, etc.) are treated as
 * roughly "level-50 reference" values, scaled down/up from there — there's
 * no separately-authored per-level stat curve in the data files. */
const REFERENCE_LEVEL = 50;
/** Flat HP floor so low-level creatures aren't reduced to single-digit HP pools. */
const HP_FLOOR = 10;

export function effectiveStats(base: StatBlock, level: number): StatBlock {
  const scale = (v: number) => Math.max(1, Math.round((v * level) / REFERENCE_LEVEL));
  return {
    hp: scale(base.hp) + HP_FLOOR,
    atk: scale(base.atk),
    def: scale(base.def),
    spatk: scale(base.spatk),
    spdef: scale(base.spdef),
    speed: scale(base.speed),
  };
}

/**
 * XP required to advance from `level` to `level + 1`. It grows with the square of the level,
 * while what a foe is worth grows only in a straight line — so each level takes more fights
 * than the last: about three wild fights a level at the start, five around level 30, seven by 50.
 * (It used to be linear on both sides, which made every fight worth the same share of a level
 * forever, and a trainer's creature worth one or two whole levels late in the game.)
 */
export function xpToNextLevel(level: number): number {
  return Math.round(60 + 10 * level + 0.9 * level * level);
}

/**
 * XP for defeating a creature at `foeLevel`. When the winner's level is given, the reward is
 * scaled by how the two compare: beating something far below you is worth little, beating
 * something above you is worth more — so grinding weak creatures stops paying, and you can't
 * outpace the road.
 */
export function xpRewardForLevel(foeLevel: number, winnerLevel?: number): number {
  const base = Math.max(5, foeLevel * 8);
  if (winnerLevel === undefined) return base;
  // Capped, so a much stronger foe is worth more but never a windfall.
  const scale = Math.min(1.4, Math.pow((2 * foeLevel + 10) / (foeLevel + winnerLevel + 10), 2.5));
  return Math.max(1, Math.round(base * scale));
}

/** Currency awarded for defeating or catching a creature at the given level. */
export function currencyRewardForLevel(level: number): number {
  return Math.max(3, level * 5);
}
