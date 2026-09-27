// Builds src/data/learnsets.json: what every creature learns as it levels.
//
// Run with `node scripts/build-learnsets.mjs`. Deterministic — the same data always gives the
// same learnsets — so it can be re-run whenever moves or creatures change.
//
// The rules:
// - A whole evolution line shares one learnset, so evolving never interrupts the flow of new
//   moves, and every stage of the line gets something new every 5–7 levels up to level 80.
// - The hand-picked moves (scripts/learnsets-handpicked.json) are kept; generated moves fill the gaps.
// - Moves come from the line's own types first, then from closely related types (Water and Ice
//   share moves, Rock and Ground, Dark and Fighting...), then from the Normal pool anyone can
//   learn.
// - New is not the same as stronger. Each slot cycles through roles — a quick move that strikes
//   first, a hit that weakens the foe, a setup move, a reliable strong hit, a big hit that can
//   miss, a very strong hit that weakens the user — and the strongest ones are held back until
//   the line is old enough for them.
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), "utf8"));
const moves = read("moves.json").moves.filter((m) => !m.signature && !["scrap", "tackle"].includes(m.id));
const wild = read("wildCreatures.json").wildCreatures;
const variants = read("regionalVariants.json").regionalVariants;
const legendaries = read("legendaries.json").legendaries;
const starters = read("starters.json").starters;
// The hand-picked learnsets the game shipped with; generated moves are laid around them.
const existing = JSON.parse(readFileSync(new URL("./learnsets-handpicked.json", import.meta.url), "utf8")).learnsets;

/** Types that can learn each other's moves. Symmetric. */
const AFFINITY = [
  ["Water", "Ice"],
  ["Ground", "Rock"],
  ["Fighting", "Dark"],
  ["Steel", "Rock"],
  ["Dragon", "Fire"],
  ["Fairy", "Electric"],
  ["Flying", "Dragon"],
  ["Grass", "Bug"],
  ["Poison", "Bug"],
  ["Ghost", "Dark"],
  ["Psychic", "Fairy"],
  ["Psychic", "Ghost"],
  ["Electric", "Steel"],
  ["Water", "Flying"],
  ["Grass", "Ground"],
  ["Fire", "Ground"],
  ["Ice", "Flying"],
  ["Fighting", "Steel"],
  ["Poison", "Ghost"],
];
const related = (type) => AFFINITY.flatMap(([a, b]) => (a === type ? [b] : b === type ? [a] : []));

/** What a move is for, read off its numbers. */
function roleOf(m) {
  if (m.category === "status") return "setup";
  if (m.basePriority > 0) return "quick";
  const selfDrop = (m.statChanges ?? []).some((c) => c.target === "self" && c.stages < 0);
  if (m.power >= 120 || (m.power >= 100 && selfDrop)) return "heavy";
  if (m.power >= 100 || (m.power >= 80 && m.accuracy <= 80)) return "gamble";
  if (m.power >= 80) return "strong";
  if ((m.statChanges ?? []).some((c) => c.target === "opponent")) return "debuff";
  return "basic";
}
/** The earliest level a role is handed out at. */
const ROLE_LEVEL = { quick: 1, basic: 1, debuff: 8, setup: 10, strong: 22, gamble: 30, heavy: 40 };
/** ...and the last: a light move learned at level 70 would be a wasted slot. */
const ROLE_LAST_LEVEL = { quick: 40, basic: 34, debuff: 58, setup: 99, strong: 99, gamble: 99, heavy: 99 };
/** The order roles come round in — a mix, so the newest move is not always the biggest. */
const ROLE_CYCLE = ["debuff", "setup", "strong", "quick", "gamble", "basic", "heavy", "setup", "strong", "debuff"];

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Evolution lines ────────────────────────────────────────────────────────────────────────
const species = new Map();
for (const s of [...wild, ...variants, ...legendaries]) species.set(s.id, { id: s.id, types: s.types, stats: s.baseStats, moves: s.moveIds ?? [], next: s.evolvesInto ?? null });
const lines = [];
for (const line of starters) {
  lines.push(line.stages.map((st) => ({ id: st.id, types: st.types, stats: st.baseStats, moves: [] })));
}
const isTarget = new Set([...species.values()].map((s) => s.next).filter(Boolean));
for (const s of species.values()) {
  if (isTarget.has(s.id)) continue; // not a line's first stage
  const line = [];
  for (let cur = s; cur; cur = cur.next ? species.get(cur.next) : null) line.push(cur);
  lines.push(line);
}

const MAX_LEVEL = 80;
const out = {};
for (const line of lines) {
  const root = line[0].id;
  const random = rng(hash(`learnset:${root}`));
  const types = [...new Set(line.flatMap((s) => s.types))];
  const last = line[line.length - 1];
  const physical = last.stats.atk >= last.stats.spatk;
  const known = new Set(line.flatMap((s) => s.moves));

  // Hand-picked entries from every stage, earliest level of each move kept.
  const entries = [];
  for (const s of line) {
    for (const e of existing[s.id] ?? []) {
      if (entries.some((x) => x.moveId === e.moveId)) continue;
      entries.push({ level: e.level, moveId: e.moveId });
    }
  }
  // Two stages' lists can both grant something at the same level; spread them out.
  entries.sort((a, b) => a.level - b.level);
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].level <= entries[i - 1].level) entries[i].level = entries[i - 1].level + 2;
  }
  const taken = new Set([...known, ...entries.map((e) => e.moveId)]);

  const own = moves.filter((m) => types.includes(m.type));
  const near = moves.filter((m) => !types.includes(m.type) && types.some((t) => related(t).includes(m.type)));
  const normal = moves.filter((m) => m.type === "Normal" && !types.includes("Normal"));

  let roleIndex = Math.floor(random() * ROLE_CYCLE.length);
  let sourceIndex = 0;
  // Own type most of the time; related types and the shared pool in between.
  const SOURCES = ["own", "own", "near", "own", "normal", "own", "near"];

  const step = () => 5 + Math.floor(random() * 3);
  let previous = 0;
  // Generated moves start at 7: every starter and most first catches are already level 5.
  for (let level = 7 + Math.floor(random() * 2); level <= MAX_LEVEL; level = previous + step()) {
    // A hand-picked move landing about here takes the slot — as long as it keeps the gap to 7.
    const nearby = entries.filter((e) => e.level > previous && e.level >= level - 2 && e.level <= previous + 7).map((e) => e.level);
    if (nearby.length) {
      previous = Math.max(...nearby);
      continue;
    }
    previous = level;
    let pick = null;
    for (let attempt = 0; attempt < ROLE_CYCLE.length * 3 && !pick; attempt++) {
      const role = ROLE_CYCLE[(roleIndex + attempt) % ROLE_CYCLE.length];
      const source = SOURCES[(sourceIndex + Math.floor(attempt / ROLE_CYCLE.length)) % SOURCES.length];
      const pool = source === "own" ? own : source === "near" ? near : normal;
      const fits = pool.filter((m) => !taken.has(m.id) && roleOf(m) === role && ROLE_LEVEL[role] <= level && level <= ROLE_LAST_LEVEL[role]);
      // Lean towards the creature's better attacking side, but not exclusively.
      const preferred = fits.filter((m) => m.category === "status" || (m.category === "physical") === physical);
      const choices = preferred.length && random() < 0.75 ? preferred : fits;
      if (choices.length) pick = choices[Math.floor(random() * choices.length)];
    }
    roleIndex++;
    sourceIndex++;
    if (!pick) continue;
    taken.add(pick.id);
    entries.push({ level, moveId: pick.id });
  }
  entries.sort((a, b) => a.level - b.level);
  for (const s of line) out[s.id] = entries;
}

const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(new URL("../src/data/learnsets.json", import.meta.url), JSON.stringify({ learnsets: sorted }, null, 2) + "\n");
const counts = Object.values(sorted).map((e) => e.length);
console.log(`${Object.keys(sorted).length} species, ${Math.min(...counts)}–${Math.max(...counts)} moves each`);
