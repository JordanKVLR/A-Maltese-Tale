import { useGameStore } from "../../state/gameStore";
import { tutorMovesFor, tutorPrice } from "../tutor";
import { learnsetFor } from "../learnsetsRepo";
import { purchasableItems } from "../itemsRepo";
import { friendshipOf } from "../friendship";
import type { PartyMember } from "../party";

const member = (over: Partial<PartyMember> = {}): PartyMember => ({
  uid: "a", speciesId: "calfleaf", displayName: "Calfleaf", types: ["Grass"], level: 30, xp: 0,
  baseStats: { hp: 75, atk: 92, def: 81, spatk: 55, spdef: 76, speed: 51 }, currentHp: 0, moveIds: ["tackle"], sourceCategory: "starter",
  ...over,
});

describe("things worth spending gold on", () => {
  it("sells a revive and a treat — but never Kinnie", () => {
    const ids = purchasableItems().map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["helwa_tat_tork", "imqaret"]));
    expect(ids).not.toContain("kinnie");
  });

  it("revives only a knocked-out creature, to half HP", () => {
    useGameStore.setState({ party: [member()], inventory: { helwa_tat_tork: 1, imqaret: 1 } });
    const result = useGameStore.getState().useItemOnPartyMember("a", "helwa_tat_tork");
    expect(result).toMatchObject({ applied: true, effect: "revive" });
    expect(useGameStore.getState().party[0].currentHp).toBeGreaterThan(0);
    useGameStore.setState({ inventory: { helwa_tat_tork: 1, imqaret: 1 } });
    expect(useGameStore.getState().useItemOnPartyMember("a", "helwa_tat_tork").applied).toBe(false);
  });

  it("treats raise friendship", () => {
    useGameStore.setState({ party: [member({ currentHp: 10, friendship: 100 })], inventory: { imqaret: 1 } });
    useGameStore.getState().useItemOnPartyMember("a", "imqaret");
    expect(friendshipOf(useGameStore.getState().party[0])).toBe(125);
  });

  it("the tutor offers only moves already reached and not known, pricier when stronger", () => {
    const moves = tutorMovesFor(member({ level: 30 }));
    const reached = learnsetFor("calfleaf").filter((e) => e.level <= 30);
    expect(moves.length).toBe(reached.length);
    expect(moves.every((m) => m.level <= 30)).toBe(true);
    expect(tutorMovesFor(member({ level: 30, moveIds: [moves[0].moveId] })).map((m) => m.moveId)).not.toContain(moves[0].moveId);
    expect(tutorPrice("all_out_rush")).toBeGreaterThan(tutorPrice("dart_strike"));
  });

  it("the tutor fills a free slot", () => {
    useGameStore.setState({ party: [member({ currentHp: 10 })] });
    expect(useGameStore.getState().learnMove("a", "carob_pod")).toBe(true);
    expect(useGameStore.getState().party[0].moveIds).toContain("carob_pod");
  });
});
