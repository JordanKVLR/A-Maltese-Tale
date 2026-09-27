import type { TypeName } from "../data/schemas";
import type { PartyMember } from "./party";
import { trainersForZone } from "./trainers";

/**
 * Side quests: one quest-giver waiting somewhere in each leg of the journey, asking for
 * something that sends you along — and sometimes back along — the road. Each pays out a key
 * item that changes what you can do: trap better, row to an island, part a fog, or learn the
 * one move your starter was born for.
 *
 * The quests are optional except for one thing — the Signature Scroll is the only way a
 * starter learns its signature move. The areas the other items open are bonuses off the road,
 * never needed to finish the game.
 *
 * Kept free of React and the store, so the rules can be tested on their own; everything a step
 * needs to know is passed in as a QuestWorld.
 */

export type QuestStep =
  /** Catch this many creatures of a type, counted from when the quest was taken. */
  | { kind: "catch"; type: TypeName; count: number }
  /** Beat every trainer standing in these zones. */
  | { kind: "trainers"; zoneIds: string[] }
  /** Find a particular glinting object on a map. It only shows while the quest is active. */
  | { kind: "find"; findId: string; zoneId: string }
  /** Bring a creature of your starter's line up to this level. */
  | { kind: "starterLevel"; level: number };

export interface QuestDef {
  id: string;
  giver: { name: string; zoneId: string; look: "herbalist" | "archivist" | "fisher" | "sacristan" };
  /** The quest-giver waits for this medal before handing the quest over. */
  requiresMedal?: string;
  steps: QuestStep[];
  reward: { keyItemId: string; gold: number };
}

export const QUESTS: QuestDef[] = [
  {
    id: "eye_of_ghajn",
    giver: { name: "Nanna Rożi", zoneId: "salina_saltpans", look: "herbalist" },
    steps: [
      { kind: "catch", type: "Grass", count: 1 },
      { kind: "catch", type: "Water", count: 1 },
      { kind: "find", findId: "blue_bead", zoneId: "dingli_cliffs" },
    ],
    reward: { keyItemId: "il_ghajn_charm", gold: 150 },
  },
  {
    id: "signature_scroll",
    giver: { name: "Archivist Pawla", zoneId: "mdina_bastions", look: "archivist" },
    requiresMedal: "silent_city",
    steps: [
      { kind: "find", findId: "torn_page", zoneId: "melita_woods" },
      { kind: "starterLevel", level: 16 },
    ],
    reward: { keyItemId: "signature_scroll", gold: 250 },
  },
  {
    id: "fishermans_oar",
    giver: { name: "Kaptan Salvu", zoneId: "marsaxlokk_bay", look: "fisher" },
    steps: [
      { kind: "trainers", zoneIds: ["marsaxlokk_bay", "wied_ghasel"] },
      { kind: "find", findId: "oar_blade", zoneId: "simar_wetlands" },
    ],
    reward: { keyItemId: "luzzu_oar", gold: 400 },
  },
  {
    id: "silent_bell",
    giver: { name: "Sacristan Indri", zoneId: "mtahleb_terraces", look: "sacristan" },
    steps: [
      { kind: "catch", type: "Rock", count: 2 },
      { kind: "find", findId: "bell_clapper", zoneId: "azure_caverns" },
      { kind: "trainers", zoneIds: ["golden_bay"] },
    ],
    reward: { keyItemId: "silent_bell", gold: 600 },
  },
];

export type QuestStatus = "active" | "done";

/** What the save keeps per quest the player has taken. */
export interface QuestRecord {
  status: QuestStatus;
  /** Catches per type at the moment the quest was taken, so only new catches count. */
  catchBaseline: Record<string, number>;
}

/** Everything a quest step can be judged against. */
export interface QuestWorld {
  quests: Record<string, QuestRecord>;
  catchesByType: Record<string, number>;
  defeatedTrainerIds: readonly string[];
  foundIds: readonly string[];
  party: readonly Pick<PartyMember, "sourceCategory" | "level">[];
  medals: readonly string[];
  visitedStageIds: readonly string[];
}

export interface StepProgress {
  step: QuestStep;
  current: number;
  target: number;
  done: boolean;
}

export function getQuest(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function questGivenIn(zoneId: string): QuestDef | undefined {
  return QUESTS.find((q) => q.giver.zoneId === zoneId);
}

/** The quest a find belongs to, if it is a quest object rather than a loose treasure. */
export function questForFind(findId: string): QuestDef | undefined {
  return QUESTS.find((q) => q.steps.some((s) => s.kind === "find" && s.findId === findId));
}

export function stepProgress(quest: QuestDef, step: QuestStep, world: QuestWorld): StepProgress {
  switch (step.kind) {
    case "catch": {
      const baseline = world.quests[quest.id]?.catchBaseline[step.type] ?? 0;
      const current = Math.min(step.count, Math.max(0, (world.catchesByType[step.type] ?? 0) - baseline));
      return { step, current, target: step.count, done: current >= step.count };
    }
    case "trainers": {
      const ids = step.zoneIds.flatMap((z) => trainersForZone(z).map((t) => t.id));
      const current = ids.filter((id) => world.defeatedTrainerIds.includes(id)).length;
      return { step, current, target: ids.length, done: current >= ids.length };
    }
    case "find": {
      const found = world.foundIds.includes(step.findId);
      return { step, current: found ? 1 : 0, target: 1, done: found };
    }
    case "starterLevel": {
      const best = Math.max(0, ...world.party.filter((m) => m.sourceCategory === "starter").map((m) => m.level));
      return { step, current: Math.min(best, step.level), target: step.level, done: best >= step.level };
    }
  }
}

export function questProgress(quest: QuestDef, world: QuestWorld): StepProgress[] {
  return quest.steps.map((step) => stepProgress(quest, step, world));
}

/**
 * Where a quest stands for the player:
 * - "unknown": its quest-giver's zone hasn't been reached yet — the log keeps it a mystery.
 * - "locked": you have met the quest-giver but they are waiting on a medal.
 * - "available": you can take it now.
 * - "active": taken, not every step done yet.
 * - "ready": every step done — go back and hand it in.
 * - "done": handed in, reward received.
 */
export type QuestState = "unknown" | "locked" | "available" | "active" | "ready" | "done";

export function questState(quest: QuestDef, world: QuestWorld): QuestState {
  const record = world.quests[quest.id];
  if (record?.status === "done") return "done";
  if (record?.status === "active") return questProgress(quest, world).every((p) => p.done) ? "ready" : "active";
  if (!world.visitedStageIds.includes(quest.giver.zoneId)) return "unknown";
  if (quest.requiresMedal && !world.medals.includes(quest.requiresMedal)) return "locked";
  return "available";
}

/** Whether a quest object should be glinting on the map right now. */
export function findIsVisible(findId: string, world: QuestWorld): boolean {
  if (world.foundIds.includes(findId)) return false;
  const quest = questForFind(findId);
  if (!quest) return true;
  return world.quests[quest.id]?.status === "active";
}
