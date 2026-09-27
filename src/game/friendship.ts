import type { PartyMember } from "./party";

/**
 * Friendship: how much a creature trusts you, 0–255. It grows as you fight together, level up
 * and look after it, and dips when it is knocked out. A creature that is close to you fights
 * harder for you: it may hang on at 1 HP through a blow that should have knocked it out, and
 * it learns faster.
 *
 * A starter begins already fond of you — it chose you, after all. Everything else starts wary.
 */

export const FRIENDSHIP_MAX = 255;
const STARTER_FRIENDSHIP = 120;
const DEFAULT_FRIENDSHIP = 70;

export const FRIENDSHIP_GAIN = {
  /** Took part in a battle you won. */
  battleWon: 4,
  levelUp: 2,
  /** Was healed or fed with an item. */
  cared: 3,
  /** Rested at a chapel. */
  rested: 1,
  /** Was knocked out. */
  fainted: -4,
} as const;

export type FriendshipTier = "wary" | "friendly" | "close" | "devoted";

const TIERS: { tier: FriendshipTier; from: number; endure: number; xpBonus: number }[] = [
  { tier: "devoted", from: 220, endure: 0.2, xpBonus: 0.2 },
  { tier: "close", from: 150, endure: 0.1, xpBonus: 0.1 },
  { tier: "friendly", from: 100, endure: 0, xpBonus: 0 },
  { tier: "wary", from: 0, endure: 0, xpBonus: 0 },
];

export function friendshipOf(member: Pick<PartyMember, "friendship" | "sourceCategory">): number {
  return member.friendship ?? (member.sourceCategory === "starter" ? STARTER_FRIENDSHIP : DEFAULT_FRIENDSHIP);
}

function tierInfo(friendship: number) {
  return TIERS.find((t) => friendship >= t.from)!;
}

export function friendshipTier(friendship: number): FriendshipTier {
  return tierInfo(friendship).tier;
}

/** The chance a blow that would knock this creature out leaves it on 1 HP. */
export function endureChance(friendship: number): number {
  return tierInfo(friendship).endure;
}

/** Extra experience a close creature earns, as a fraction (0.1 = +10%). */
export function friendshipXpBonus(friendship: number): number {
  return tierInfo(friendship).xpBonus;
}

/** 0–5 hearts, for showing at a glance. */
export function friendshipHearts(friendship: number): number {
  return Math.round((Math.max(0, Math.min(FRIENDSHIP_MAX, friendship)) / FRIENDSHIP_MAX) * 5);
}

export function withFriendship<T extends Pick<PartyMember, "friendship" | "sourceCategory">>(member: T, delta: number): T {
  const next = Math.max(0, Math.min(FRIENDSHIP_MAX, friendshipOf(member) + delta));
  return { ...member, friendship: next };
}
