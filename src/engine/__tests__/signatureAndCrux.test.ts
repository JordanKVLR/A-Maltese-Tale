import { makeCreature, makeMove } from "./testHelpers";
import { calculateDamage } from "../damage";
import { resolveAction } from "../battleManager";
import { CRUX_FULL, chargeFromHit, cruxReady } from "../cruxMeter";
import { chooseCruxMove, signatureDamageOptions, valourMultiplier } from "../signature";
import { CRUX_AURA_STATUS_ID } from "../cruxAura";
import type { BattleContext, Move } from "../types";

const fixed = { isCrit: false, randomFactor: 1 };

describe("signature moves", () => {
  it("pierce ignores the target's raised defence", () => {
    const attacker = makeCreature({ types: ["Normal"] });
    const guarded = makeCreature({ id: "b", statStages: { ...makeCreature().statStages, def: 4 } });
    const plain = makeMove({ type: "Grass" });
    const pierce = makeMove({ type: "Grass", signature: "pierce" });
    const normalHit = calculateDamage(attacker, guarded, plain, { ...fixed, ...signatureDamageOptions(attacker, plain) });
    const pierceHit = calculateDamage(attacker, guarded, pierce, { ...fixed, ...signatureDamageOptions(attacker, pierce) });
    expect(pierceHit).toBeGreaterThan(normalHit * 2);
  });

  it("valour grows as the user's HP runs out, up to double", () => {
    expect(valourMultiplier(makeCreature({ currentHp: 100 }))).toBeCloseTo(1);
    expect(valourMultiplier(makeCreature({ currentHp: 50 }))).toBeCloseTo(1.5);
    expect(valourMultiplier(makeCreature({ currentHp: 1 }))).toBeCloseTo(1.99);
  });

  it("solstice is never resisted, though immunities still hold", () => {
    const attacker = makeCreature({ types: ["Normal"] });
    const steel = makeCreature({ id: "b", types: ["Steel"] });
    const rockBeam = makeMove({ type: "Rock", category: "special" });
    const solstice = makeMove({ type: "Rock", category: "special", signature: "solstice" });
    const resisted = calculateDamage(attacker, steel, rockBeam, { ...fixed, ...signatureDamageOptions(attacker, rockBeam) });
    const unresisted = calculateDamage(attacker, steel, solstice, { ...fixed, ...signatureDamageOptions(attacker, solstice) });
    expect(unresisted).toBeGreaterThan(resisted * 1.8);
    const ghost = makeCreature({ id: "g", types: ["Ghost"] });
    expect(calculateDamage(attacker, ghost, makeMove({ type: "Normal", signature: "solstice" }), fixed)).toBe(0);
  });

  it("the Crux move is the signature if known, else the strongest attack", () => {
    const moves: Move[] = [makeMove({ id: "a", power: 40 }), makeMove({ id: "b", power: 90 }), makeMove({ id: "c", category: "status", power: 0 })];
    expect(chooseCruxMove(moves)).toBe("b");
    expect(chooseCruxMove([...moves, makeMove({ id: "sig", power: 70, signature: "valour" })])).toBe("sig");
  });
});

describe("the Crux meter", () => {
  it("fills from blows traded, faster from taking them", () => {
    const a = makeCreature({ id: "a" });
    const b = makeCreature({ id: "b" });
    chargeFromHit(a, b, 30, 1);
    expect(a.cruxCharge).toBeGreaterThan(0);
    expect(b.cruxCharge!).toBeGreaterThan(a.cruxCharge!);
    for (let i = 0; i < 10; i++) chargeFromHit(a, b, 30, 2);
    expect(a.cruxCharge).toBe(CRUX_FULL);
    expect(cruxReady(a)).toBe(true);
  });

  it("can only be invoked when full, and empties when it is", () => {
    const player = makeCreature({ id: "p" });
    const enemy = makeCreature({ id: "e" });
    const ctx = { playerActive: player, enemyActive: enemy } as unknown as BattleContext;
    const early = resolveAction(ctx, { kind: "invoke_crux", actorId: "p" }, () => makeMove());
    expect(early.hit).toBe(false);
    expect(player.activeEffects.some((e) => e.id === CRUX_AURA_STATUS_ID)).toBe(false);

    player.cruxCharge = CRUX_FULL;
    const ready = resolveAction(ctx, { kind: "invoke_crux", actorId: "p" }, () => makeMove());
    expect(ready.hit).toBe(true);
    expect(player.cruxCharge).toBe(0);
    expect(player.activeEffects.some((e) => e.id === CRUX_AURA_STATUS_ID)).toBe(true);
  });

  it("unleashes the chosen move: harder, and it cannot miss", () => {
    const player = makeCreature({ id: "p", cruxMoveId: "big" });
    const enemy = makeCreature({ id: "e", currentHp: 1000, stats: { ...makeCreature().stats, hp: 1000 } });
    const ctx = { playerActive: player, enemyActive: enemy } as unknown as BattleContext;
    const move = makeMove({ id: "big", accuracy: 10, power: 80 });
    player.cruxCharge = CRUX_FULL;
    resolveAction(ctx, { kind: "invoke_crux", actorId: "p" }, () => move);
    const outcome = resolveAction(ctx, { kind: "move", actorId: "p", moveId: "big" }, () => move, () => 0.99);
    expect(outcome.hit).toBe(true);
    expect(outcome.unleashed).toBe(true);
  });
});
