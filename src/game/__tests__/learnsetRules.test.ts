import learnsetsData from "../../data/learnsets.json";
import { getMove } from "../movesRepo";
import { movesKnownAtLevel } from "../learnsetsRepo";
import { getDexEntry } from "../speciesCatalog";

const learnsets = learnsetsData.learnsets as Record<string, { level: number; moveId: string }[]>;

describe("learnsets", () => {
  const ids = Object.keys(learnsets);

  it("covers every creature", () => {
    expect(ids.length).toBeGreaterThanOrEqual(100);
    for (const id of ids) expect(getDexEntry(id)).toBeDefined();
  });

  it("gives every creature a new move every 5–7 levels, all the way up", () => {
    for (const id of ids) {
      const levels = learnsets[id].map((e) => e.level);
      expect(levels[0]).toBeLessThanOrEqual(9);
      expect(levels[levels.length - 1]).toBeGreaterThanOrEqual(73);
      for (let i = 1; i < levels.length; i++) {
        const gap = levels[i] - levels[i - 1];
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(7);
      }
    }
  });

  it("only teaches real moves, never twice, never a signature", () => {
    for (const id of ids) {
      const moves = learnsets[id].map((e) => e.moveId);
      expect(new Set(moves).size).toBe(moves.length);
      for (const m of moves) expect(getMove(m).signature).toBeUndefined();
    }
  });

  it("mixes roles — later moves are not simply bigger", () => {
    for (const id of ids) {
      const moves = learnsets[id].map((e) => getMove(e.moveId));
      expect(moves.some((m) => m.category === "status")).toBe(true);
      const powers = moves.map((m) => m.power);
      const alwaysRising = powers.every((p, i) => i === 0 || p >= powers[i - 1]);
      expect(alwaysRising).toBe(false);
    }
  });

  it("draws on related types and the shared pool, not only a creature's own", () => {
    let borrowed = 0;
    for (const id of ids) {
      const types = getDexEntry(id)!.types;
      if (learnsets[id].some((e) => !types.includes(getMove(e.moveId).type))) borrowed++;
    }
    expect(borrowed / ids.length).toBeGreaterThan(0.9);
  });

  it("builds high-level creatures with a sensible four: mostly attacks, at most one setup move", () => {
    for (const id of ids) {
      const moves = movesKnownAtLevel(id, 60, ["scatter_shot"]).map(getMove);
      expect(moves.length).toBe(4);
      expect(moves.filter((m) => m.category === "status").length).toBeLessThanOrEqual(1);
    }
  });
});
