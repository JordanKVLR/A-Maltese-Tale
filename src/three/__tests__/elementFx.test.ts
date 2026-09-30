import { ELEMENT_FX, pathOffset } from "../elementFx";
import typeChart from "../../data/type_chart.json";

describe("element effects", () => {
  it("gives every type its own look", () => {
    for (const type of typeChart.types) expect(ELEMENT_FX[type as keyof typeof ELEMENT_FX]).toBeDefined();
    const signatures = new Set(Object.values(ELEMENT_FX).map((fx) => `${fx.path}/${fx.body}/${fx.colors[0]}`));
    expect(signatures.size).toBe(Object.keys(ELEMENT_FX).length);
  });

  it("uses a range of paths and bodies", () => {
    expect(new Set(Object.values(ELEMENT_FX).map((fx) => fx.path)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(Object.values(ELEMENT_FX).map((fx) => fx.body)).size).toBeGreaterThanOrEqual(5);
  });

  it("every path starts at the attacker and ends on the target", () => {
    for (const fx of Object.values(ELEMENT_FX)) {
      const end = pathOffset(fx.path, 1, 0);
      expect(Math.abs(end.up)).toBeLessThan(0.01);
      expect(Math.abs(end.side)).toBeLessThan(0.01);
      if (fx.path !== "fromAbove") expect(pathOffset(fx.path, 0, 0).along).toBe(0);
    }
  });
});
