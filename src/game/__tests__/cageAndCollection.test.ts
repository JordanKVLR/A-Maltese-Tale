import { useGameStore } from "../../state/gameStore";
import { collectorMedalsCrossed, nextCollectorMedal, ownedCount, COLLECTOR_MEDALS, TOTAL_SPECIES } from "../collection";
import { DEX_ENTRIES } from "../speciesCatalog";
import type { PartyMember } from "../party";

const creature = (uid: string, hp = 10): PartyMember => ({
  uid, speciesId: "calfleaf", displayName: uid, types: ["Grass"], level: 5, xp: 0,
  baseStats: { hp: 75, atk: 92, def: 81, spatk: 55, spdef: 76, speed: 51 }, currentHp: hp, moveIds: ["tackle"], sourceCategory: "wild",
});

describe("the Gaġġa", () => {
  beforeEach(() => useGameStore.setState({ party: [creature("a")], cage: [], caughtSpeciesIds: [] }));

  it("takes a catch when the party is full, healed", () => {
    useGameStore.setState({ party: ["a", "b", "c", "d", "e", "f"].map((u) => creature(u)) });
    expect(useGameStore.getState().catchCreature(creature("g", 1))).toBe("cage");
    const stored = useGameStore.getState().cage[0];
    expect(stored.uid).toBe("g");
    expect(stored.currentHp).toBeGreaterThan(1);
    expect(useGameStore.getState().party).toHaveLength(6);
  });

  it("puts a catch in the party when there is room", () => {
    expect(useGameStore.getState().catchCreature(creature("b"))).toBe("party");
    expect(useGameStore.getState().party).toHaveLength(2);
  });

  it("never leaves you without a creature that can fight", () => {
    expect(useGameStore.getState().depositCreature("a")).toBe(false);
    useGameStore.setState({ party: [creature("a"), creature("b", 0)] });
    expect(useGameStore.getState().depositCreature("a")).toBe(false);
    expect(useGameStore.getState().depositCreature("b")).toBe(true);
    expect(useGameStore.getState().cage.map((m) => m.uid)).toEqual(["b"]);
  });

  it("withdraws when there is room and swaps in the same slot", () => {
    useGameStore.setState({ party: [creature("a"), creature("b")], cage: [creature("x")] });
    expect(useGameStore.getState().swapWithCage("a", "x")).toBe(true);
    expect(useGameStore.getState().party.map((m) => m.uid)).toEqual(["x", "b"]);
    expect(useGameStore.getState().cage.map((m) => m.uid)).toEqual(["a"]);
    expect(useGameStore.getState().withdrawCreature("a")).toBe(true);
    expect(useGameStore.getState().party).toHaveLength(3);
  });
});

describe("collector medals", () => {
  it("run 25, 50, 75, 100, then every creature", () => {
    expect(COLLECTOR_MEDALS.map((m) => m.count)).toEqual([25, 50, 75, 100, TOTAL_SPECIES]);
    expect(TOTAL_SPECIES).toBe(DEX_ENTRIES.length);
  });

  it("are announced as they are crossed", () => {
    expect(collectorMedalsCrossed(24, 25).map((m) => m.id)).toEqual(["collector_25"]);
    expect(collectorMedalsCrossed(25, 26)).toEqual([]);
    expect(nextCollectorMedal(30)?.count).toBe(50);
    expect(nextCollectorMedal(TOTAL_SPECIES)).toBeUndefined();
  });

  it("count only real species, once each", () => {
    expect(ownedCount(["calfleaf", "calfleaf", "not-a-creature"])).toBe(1);
  });
});
