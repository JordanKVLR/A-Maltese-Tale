import { learnsetFor } from "./learnsetsRepo";
import { getMove } from "./movesRepo";
import type { PartyMember } from "./party";

/**
 * The Move Tutor: for gold, a creature can relearn any move from its learnset that it has
 * already reached the level for — moves it declined, or forgot to make room. Nothing it
 * hasn't earned yet, so the tutor fills in a creature's past rather than skipping ahead.
 */
export interface TutorMove {
  moveId: string;
  level: number;
  price: number;
}

/** Stronger moves cost more; setup moves sit at a flat middle price. */
export function tutorPrice(moveId: string): number {
  const move = getMove(moveId);
  if (move.category === "status") return 500;
  return Math.round((200 + move.power * 7) / 10) * 10;
}

export function tutorMovesFor(member: Pick<PartyMember, "speciesId" | "level" | "moveIds">): TutorMove[] {
  return learnsetFor(member.speciesId)
    .filter((entry) => entry.level <= member.level && !member.moveIds.includes(entry.moveId))
    .map((entry) => ({ moveId: entry.moveId, level: entry.level, price: tutorPrice(entry.moveId) }));
}
