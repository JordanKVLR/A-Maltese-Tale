import { QUESTS, questState, questProgress, findIsVisible, getQuest, type QuestWorld } from "../quests";
import { featuresForZone, reachableFrom, portalInto } from "../mapFeatures";
import { getMap } from "../mapData";
import { trainersForZone } from "../trainers";
import { STAGES, BONUS_STAGES, getStage, nextStageId, previousStageId } from "../zoneProgression";
import { getItem } from "../itemsRepo";
import { en } from "../../i18n/en";
import { i18nFor } from "../../i18n/core";
import { stepLabel } from "../questText";

const world = (over: Partial<QuestWorld> = {}): QuestWorld => ({
  quests: {},
  catchesByType: {},
  defeatedTrainerIds: [],
  foundIds: [],
  party: [],
  medals: [],
  visitedStageIds: [],
  ...over,
});

describe("quest rules", () => {
  const eye = getQuest("eye_of_ghajn")!;
  const scroll = getQuest("signature_scroll")!;

  it("is unknown until you reach the quest-giver, then available", () => {
    expect(questState(eye, world())).toBe("unknown");
    expect(questState(eye, world({ visitedStageIds: ["salina_saltpans"] }))).toBe("available");
  });

  it("waits on a medal where one is asked for", () => {
    expect(questState(scroll, world({ visitedStageIds: ["mdina_bastions"] }))).toBe("locked");
    expect(questState(scroll, world({ visitedStageIds: ["mdina_bastions"], medals: ["silent_city"] }))).toBe("available");
  });

  it("only counts catches made after the quest was taken", () => {
    const taken = { eye_of_ghajn: { status: "active" as const, catchBaseline: { Grass: 3 } } };
    const before = world({ quests: taken, catchesByType: { Grass: 3, Water: 1 } });
    expect(questProgress(eye, before).map((p) => p.done)).toEqual([false, true, false]);
    const after = world({ quests: taken, catchesByType: { Grass: 4, Water: 1 }, foundIds: ["blue_bead"] });
    expect(questState(eye, after)).toBe("ready");
  });

  it("counts every trainer in the named zones", () => {
    const oar = getQuest("fishermans_oar")!;
    const ids = ["marsaxlokk_bay", "wied_ghasel"].flatMap((z) => trainersForZone(z).map((t) => t.id));
    const w = world({ quests: { fishermans_oar: { status: "active", catchBaseline: {} } }, defeatedTrainerIds: ids });
    expect(questProgress(oar, w)[0].done).toBe(true);
    expect(questProgress(oar, w)[1].done).toBe(false);
  });

  it("checks the starter line's level", () => {
    const w = world({ quests: { signature_scroll: { status: "active", catchBaseline: {} } }, foundIds: ["torn_page"] });
    expect(questState(scroll, { ...w, party: [{ sourceCategory: "wild", level: 30 }] })).toBe("active");
    expect(questState(scroll, { ...w, party: [{ sourceCategory: "starter", level: 16 }] })).toBe("ready");
  });

  it("shows quest objects only while the quest is active", () => {
    expect(findIsVisible("blue_bead", world())).toBe(false);
    const active = world({ quests: { eye_of_ghajn: { status: "active", catchBaseline: {} } } });
    expect(findIsVisible("blue_bead", active)).toBe(true);
    expect(findIsVisible("blue_bead", { ...active, foundIds: ["blue_bead"] })).toBe(false);
    expect(findIsVisible("melita_woods:treasure:0", world())).toBe(true);
  });

  it("rewards real key items, each with text in both languages", () => {
    const mt = i18nFor("mt");
    for (const quest of QUESTS) {
      expect(getItem(quest.reward.keyItemId).category).toBe("key_items");
      for (const part of ["title", "giver", "offer1", "offer2", "thanks"]) {
        expect(Object.keys(en)).toContain(`quest.${quest.id}.${part}`);
      }
      for (const p of questProgress(quest, world())) expect(stepLabel(p, mt)).not.toMatch(/quest\./);
    }
  });
});

describe("map features", () => {
  const allZones = [...STAGES, ...BONUS_STAGES].map((s) => s.id);

  it("puts every quest-giver and quest object on its map", () => {
    for (const quest of QUESTS) {
      expect(featuresForZone(quest.giver.zoneId).npcs.map((n) => n.questId)).toContain(quest.id);
      for (const step of quest.steps) {
        if (step.kind === "find") expect(featuresForZone(step.zoneId).glints.map((g) => g.findId)).toContain(step.findId);
      }
    }
  });

  it("gives each hidden area a way in", () => {
    for (const bonus of BONUS_STAGES) {
      const portal = portalInto(bonus.id);
      expect(portal?.toZoneId).toBe(bonus.id);
      expect(previousStageId(bonus.id)).toBe(bonus.bonus!.fromZoneId);
      expect(nextStageId(bonus.id)).toBeNull();
    }
  });

  it("never walls anything off, and never stacks two things on one tile", () => {
    for (const zoneId of allZones) {
      const map = getMap(zoneId);
      const f = featuresForZone(zoneId);
      const blocked = new Set([
        ...trainersForZone(zoneId).map((t) => `${t.position.row},${t.position.col}`),
        ...f.npcs.map((n) => `${n.row},${n.col}`),
      ]);
      const reach = reachableFrom(map, map.playerStart, blocked);
      const spots = [...f.glints, ...(f.portal ? [f.portal] : [])];
      for (const s of spots) expect(reach.has(`${s.row},${s.col}`)).toBe(true);
      for (const t of trainersForZone(zoneId)) {
        // Every trainer still has a free tile beside them to be challenged from.
        const sides = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => `${t.position.row + dr},${t.position.col + dc}`);
        expect(sides.some((k) => reach.has(k))).toBe(true);
      }
      const exit = map.rows.flatMap((row, r) => row.map((tile, c) => (tile === "exit" ? `${r},${c}` : null))).find(Boolean)!;
      expect(reach.has(exit)).toBe(true);
      const all = [...spots, ...f.npcs].map((s) => `${s.row},${s.col}`);
      expect(new Set([...all, ...blocked]).size).toBe(new Set(blocked).size + spots.length);
    }
  });

  it("scales hidden areas above where they are reached from", () => {
    for (const bonus of BONUS_STAGES) {
      expect(bonus.baseLevel).toBeGreaterThan(getStage(bonus.bonus!.fromZoneId)!.baseLevel);
    }
  });
});
