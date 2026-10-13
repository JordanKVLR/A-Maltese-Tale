import { uniqueIds } from "../uniqueIds";
import { HARSI_SVG } from "../harsi/sprites.generated";
import { PEOPLE_SVG } from "../people/sprites.generated";

describe("uniqueIds", () => {
  it("renames every id and every reference to it, and nothing else", () => {
    const out = uniqueIds('<svg><defs><linearGradient id="a-body"/></defs><path fill="url(#a-body)" clip-path="url(#a-clip)"/><clipPath id="a-clip"/></svg>', 7);
    expect(out).toBe('<svg><defs><linearGradient id="a-body-7"/></defs><path fill="url(#a-body-7)" clip-path="url(#a-clip-7)"/><clipPath id="a-clip-7"/></svg>');
  });

  it("keeps every reference in every drawing pointing at an id that still exists", () => {
    for (const xml of [...Object.values(HARSI_SVG), ...Object.values(PEOPLE_SVG)]) {
      const out = uniqueIds(xml, 3);
      const ids = new Set([...out.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const m of out.matchAll(/url\(#([^)]+)\)/g)) expect(ids.has(m[1])).toBe(true);
    }
  });
});
