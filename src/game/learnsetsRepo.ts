import learnsetsData from "../data/learnsets.json";
import { LearnsetsFileSchema } from "../data/schemas";
import { getMove } from "./movesRepo";

const learnsets = LearnsetsFileSchema.parse(learnsetsData).learnsets;

export interface LearnedMove {
  level: number;
  moveId: string;
}

/** Every move this species picks up by levelling, in level order. */
export function learnsetFor(speciesId: string): LearnedMove[] {
  return learnsets[speciesId] ?? [];
}

/**
 * Moves unlocked by growing from `fromLevel` to `toLevel` — exclusive of the old level,
 * inclusive of the new one, so a single level-up reports exactly what that level grants and
 * a multi-level XP jump reports everything it passed through.
 *
 * Evolving mid-jump doesn't change which species' learnset applies: the caller passes the
 * species the creature *ends up as*, so an evolved form's late moves are what it learns.
 */
export function movesLearnedBetween(speciesId: string, fromLevel: number, toLevel: number): string[] {
  if (toLevel <= fromLevel) return [];
  return learnsetFor(speciesId)
    .filter((entry) => entry.level > fromLevel && entry.level <= toLevel)
    .map((entry) => entry.moveId);
}

/** How much a move is worth to a creature choosing what to carry: damage it can expect to do. */
function expectedDamage(moveId: string): number {
  const move = getMove(moveId);
  return move.category === "status" ? 0 : move.power * (move.accuracy / 100);
}

/**
 * Moves a species would already know at this level — used when building a creature that
 * starts partway up its curve (a trainer's party, a high-level wild encounter).
 *
 * With a new move every few levels there is far more to choose from than four slots, so this
 * picks a sensible set rather than simply the latest four: its three hardest-hitting moves plus
 * its most recent setup move, or a fourth attack if it has no setup move.
 */
export function movesKnownAtLevel(speciesId: string, level: number, baseMoves: string[]): string[] {
  const learned = learnsetFor(speciesId)
    .filter((entry) => entry.level <= level)
    .map((entry) => entry.moveId);
  const pool: string[] = [];
  for (const id of [...baseMoves, ...learned]) {
    if (!pool.includes(id)) pool.push(id);
  }
  if (pool.length <= 4) return pool;
  const attacks = pool.filter((id) => expectedDamage(id) > 0).sort((a, b) => expectedDamage(b) - expectedDamage(a));
  const setup = pool.filter((id) => expectedDamage(id) === 0);
  const chosen = attacks.slice(0, 3);
  const latestSetup = setup[setup.length - 1];
  if (latestSetup) chosen.push(latestSetup);
  for (const id of attacks.slice(3)) if (chosen.length < 4) chosen.push(id);
  // Keep the order they were learned in, so the move list reads naturally.
  return pool.filter((id) => chosen.includes(id));
}
