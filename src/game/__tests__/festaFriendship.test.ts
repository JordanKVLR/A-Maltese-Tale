import { festaOn, isFestaZone, FEASTS, dayKey } from "../festa";
import { STAGES } from "../zoneProgression";
import { buildBiomeEncounterTable } from "../encounterTable";
import { endureChance, friendshipOf, friendshipTier, friendshipXpBonus, withFriendship, FRIENDSHIP_MAX } from "../friendship";
import { resolveAction } from "../../engine/battleManager";
import { creatureFromPartyMember } from "../party";
import { en } from "../../i18n/en";

describe("festa", () => {
  it("holds one festa a day, the same all day, at a real stage", () => {
    const morning = festaOn(new Date(2026, 6, 4, 8));
    const night = festaOn(new Date(2026, 6, 4, 23));
    expect(morning).toEqual(night);
    expect(STAGES.map((s) => s.id)).toContain(morning.zoneId);
    expect(FEASTS).toContain(morning.feastId);
    expect(isFestaZone(morning.zoneId, new Date(2026, 6, 4))).toBe(true);
  });

  it("moves around over a month", () => {
    const zones = new Set(Array.from({ length: 30 }, (_, d) => festaOn(new Date(2026, 4, d + 1)).zoneId));
    expect(zones.size).toBeGreaterThan(8);
  });

  it("keeps the real feast days where they belong", () => {
    expect(festaOn(new Date(2026, 7, 15))).toMatchObject({ feastId: "santa_marija", zoneId: "ggantija_terrace" });
    expect(festaOn(new Date(2027, 1, 10))).toMatchObject({ feastId: "st_paul", zoneId: "grand_harbour" });
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("names every feast", () => {
    for (const f of FEASTS) expect(Object.keys(en)).toContain(`festa.name.${f}`);
  });

  it("makes rare creatures likelier", () => {
    const config = { baseLevel: 30, levelSpread: 3, legendaryMinLevel: 48 };
    const normal = buildBiomeEncounterTable("grass", "Fire", config);
    const festa = buildBiomeEncounterTable("grass", "Fire", { ...config, festa: true });
    expect(festa.length).toBe(normal.length);
    // Same creatures; only the rare ones (regional variants, legendaries) weigh more.
    const changed = festa.filter((o, i) => o.weight !== normal[i].weight);
    expect(changed.length).toBeGreaterThan(0);
    for (const o of changed) expect(o.weight).toBeGreaterThan(normal[festa.indexOf(o)].weight);
  });
});

describe("friendship", () => {
  const starter = { sourceCategory: "starter" as const };
  const wild = { sourceCategory: "wild" as const };

  it("starts starters fonder than catches, and clamps", () => {
    expect(friendshipOf(starter)).toBeGreaterThan(friendshipOf(wild));
    expect(friendshipOf(withFriendship(wild, 1000))).toBe(FRIENDSHIP_MAX);
    expect(friendshipOf(withFriendship(wild, -1000))).toBe(0);
  });

  it("only gives perks to close creatures", () => {
    expect(friendshipTier(60)).toBe("wary");
    expect(endureChance(120)).toBe(0);
    expect(endureChance(160)).toBeGreaterThan(0);
    expect(friendshipXpBonus(230)).toBeGreaterThan(friendshipXpBonus(160));
  });

  it("lets a close creature hang on at 1 HP", () => {
    const member = {
      uid: "p", speciesId: "calfleaf", displayName: "Calfleaf", types: ["Grass" as const], level: 5, xp: 0,
      baseStats: { hp: 75, atk: 92, def: 81, spatk: 55, spdef: 76, speed: 51 }, currentHp: 5, moveIds: ["tackle"],
      sourceCategory: "starter" as const, friendship: 240,
    };
    const player = creatureFromPartyMember(member);
    const foe = { ...creatureFromPartyMember({ ...member, uid: "e", level: 60, friendship: 0 }) };
    const ctx = { playerActive: player, enemyActive: foe, turnCount: 1, fieldEffects: {} };
    const move = { id: "big", name: "Big", type: "Normal" as const, category: "physical" as const, power: 250, accuracy: 100, pp: 5 };
    // Every roll 0: always hits, and the endure roll always succeeds.
    const outcome = resolveAction(ctx, { kind: "move", actorId: "e", moveId: "big" }, () => move as never, () => 0);
    expect(outcome.endured).toBe(true);
    expect(player.currentHp).toBe(1);
  });
});
