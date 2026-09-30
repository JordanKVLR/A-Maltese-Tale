import {
  CHARACTERS,
  ENDING,
  ENTRY_SCENES,
  MEDAL_SCENES,
  PROLOGUE,
  STORY_BATTLES,
  currentChapter,
  nextObjective,
  rivalStarter,
  scenesOnArrival,
  storyBattleActive,
  type StoryWorld,
} from "../story";
import { storyTrainer } from "../storyTrainers";
import { featuresForZone } from "../mapFeatures";
import { getDexEntry } from "../speciesCatalog";
import { STAGES, ALL_MEDALS, getStage } from "../zoneProgression";
import { getItem } from "../itemsRepo";

const world = (over: Partial<StoryWorld> = {}): StoryWorld => ({ storyFlags: [], medals: [], defeatedTrainerIds: [], ...over });
const gyms = STAGES.filter((s) => s.gym).map((s) => ({ zoneId: s.id, medalId: s.gym!.medalId }));

describe("the story", () => {
  const scenes = [PROLOGUE, ENDING, ...Object.values(ENTRY_SCENES), ...Object.values(MEDAL_SCENES)];
  const allLines = [...scenes.flatMap((s) => s.lines), ...STORY_BATTLES.flatMap((b) => [...b.before, ...b.win])];

  it("is written in both languages throughout, by real characters", () => {
    expect(allLines.length).toBeGreaterThan(70);
    for (const line of allLines) {
      expect(line.en.trim().length).toBeGreaterThan(0);
      expect(line.mt.trim().length).toBeGreaterThan(0);
      expect(line.en).not.toBe(line.mt);
      expect(CHARACTERS[line.who]).toBeDefined();
    }
  });

  it("covers all four chapters and every gym", () => {
    for (const medal of ALL_MEDALS) expect(MEDAL_SCENES[medal.medalId]).toBeDefined();
    for (const chapter of [1, 2, 3, 4]) expect(STORY_BATTLES.some((b) => b.chapter === chapter)).toBe(true);
    for (const zoneId of Object.keys(ENTRY_SCENES)) expect(getStage(zoneId)).toBeDefined();
  });

  it("builds every story party from real creatures, and places every story fight on its map", () => {
    for (const battle of STORY_BATTLES) {
      for (const line of ["Grass", "Fire", "Water"] as const) {
        for (const slot of battle.party(line)) expect(getDexEntry(slot.speciesId)).toBeDefined();
        expect(storyTrainer(battle.id, line)?.party.length).toBeGreaterThan(0);
      }
      expect(featuresForZone(battle.zoneId).story.map((s) => s.battleId)).toContain(battle.id);
      if (battle.reward?.itemId) expect(getItem(battle.reward.itemId)).toBeDefined();
    }
  });

  it("gives Luca the starter line strong against yours, evolved for his level", () => {
    expect(rivalStarter("Grass", 12).speciesId).toBe("pharawoof");
    expect(rivalStarter("Grass", 29).speciesId).toBe("infernux");
    expect(rivalStarter("Fire", 44).speciesId).toBe("marinedge");
    expect(rivalStarter("Water", 20).speciesId).toBe("vinehorn");
  });

  it("opens with the prologue, then tells each zone's story once", () => {
    expect(scenesOnArrival("melita_woods", world()).map((s) => s.id)).toEqual(["prologue", "enter:melita_woods"]);
    expect(scenesOnArrival("melita_woods", world({ storyFlags: ["prologue", "enter:melita_woods"] }))).toEqual([]);
  });

  it("brings story characters out as the medals come in, and in order", () => {
    const luca2 = STORY_BATTLES.find((b) => b.id === "story-luca-2")!;
    expect(storyBattleActive(luca2, world({ storyFlags: ["prologue"] }))).toBe(false);
    expect(storyBattleActive(luca2, world({ storyFlags: ["prologue"], medals: ["silent_city"] }))).toBe(false);
    expect(storyBattleActive(luca2, world({ storyFlags: ["prologue"], medals: ["silent_city"], defeatedTrainerIds: ["story-luca-1"] }))).toBe(true);
  });

  it("points at the next thing to do, and ends after the Baron", () => {
    const start = nextObjective(world({ storyFlags: ["prologue"] }), gyms);
    expect(start.kind).toBe("battle");
    const allMedals = ALL_MEDALS.map((m) => m.medalId);
    const beforeFinale = world({ storyFlags: ["prologue"], medals: allMedals, defeatedTrainerIds: STORY_BATTLES.filter((b) => !b.finale).map((b) => b.id) });
    const finale = nextObjective(beforeFinale, gyms);
    expect(finale.kind === "battle" && finale.battle.id).toBe("story-baron");
    const done = { ...beforeFinale, defeatedTrainerIds: STORY_BATTLES.map((b) => b.id) };
    expect(currentChapter(done)).toBe(5);
    expect(scenesOnArrival("grand_harbour", done).map((s) => s.id)).toContain("ending");
  });
});
