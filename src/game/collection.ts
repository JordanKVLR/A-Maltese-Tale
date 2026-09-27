import { DEX_ENTRIES } from "./speciesCatalog";

/**
 * Collector medals, for catching them all. They sit alongside the four gym medals but never
 * gate anything — they are there for the player who wants the whole Codex.
 *
 * What counts is species owned: caught, or grown into by evolving one you caught.
 */

export interface CollectorMedal {
  id: string;
  /** Species owned to earn it; the last medal asks for every one. */
  count: number;
}

export const TOTAL_SPECIES = DEX_ENTRIES.length;

export const COLLECTOR_MEDALS: CollectorMedal[] = [
  { id: "collector_25", count: 25 },
  { id: "collector_50", count: 50 },
  { id: "collector_75", count: 75 },
  { id: "collector_100", count: 100 },
  { id: "collector_all", count: TOTAL_SPECIES },
];

/** Species ids that count, ignoring anything not in the Codex. */
export function ownedCount(caughtSpeciesIds: readonly string[]): number {
  const ids = new Set(caughtSpeciesIds);
  return DEX_ENTRIES.filter((e) => ids.has(e.speciesId)).length;
}

export function collectorMedalsEarned(owned: number): CollectorMedal[] {
  return COLLECTOR_MEDALS.filter((m) => owned >= m.count);
}

/** Medals crossed by going from `before` to `after` species owned. */
export function collectorMedalsCrossed(before: number, after: number): CollectorMedal[] {
  return COLLECTOR_MEDALS.filter((m) => before < m.count && after >= m.count);
}

export function nextCollectorMedal(owned: number): CollectorMedal | undefined {
  return COLLECTOR_MEDALS.find((m) => owned < m.count);
}
