import { getMap, type TileMap } from "./mapData";
import { trainersForZone } from "./trainers";
import { bonusStageFrom, getStage, BONUS_STAGES } from "./zoneProgression";
import { QUESTS, questGivenIn, type QuestDef } from "./quests";
import { storyBattlesIn } from "./story";

/**
 * The things on a map besides trainers: quest-givers, the jetty or gate into a hidden area,
 * and glints — quest objects and loose treasure lying in the grass.
 *
 * Like the maps themselves these are placed by rule, deterministically, so a glint you saw
 * yesterday is still under the same rock today. Everything is placed on tiles you can walk to
 * from the entrance, and nothing is allowed to stand where it would wall anything else off.
 */

export interface MapNpc {
  questId: string;
  row: number;
  col: number;
}

export interface MapPortal {
  toZoneId: string;
  keyItemId: string;
  kind: "dock" | "gate";
  row: number;
  col: number;
}

export interface Treasure {
  /** Either an item and how many, or a purse of gold. */
  itemId?: string;
  quantity?: number;
  gold?: number;
}

export interface MapGlint {
  /** Stable id stored in the save once picked up. */
  findId: string;
  row: number;
  col: number;
  /** Set for loose treasure; quest objects have no contents of their own. */
  treasure?: Treasure;
}

export interface MapFeatures {
  npcs: MapNpc[];
  portal: MapPortal | null;
  glints: MapGlint[];
  /** The Gaġġa: where creatures not in your party are kept. One on every map. */
  cage: { row: number; col: number } | null;
  /** Where each of this zone's story characters stands while they wait for you. */
  story: { battleId: string; row: number; col: number }[];
}

type Spot = { row: number; col: number };

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const key = (s: Spot) => `${s.row},${s.col}`;
const NEIGHBOURS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** Every tile you can reach from the entrance, walking round anything in `blocked`. */
export function reachableFrom(map: TileMap, start: Spot, blocked: ReadonlySet<string>): Set<string> {
  const seen = new Set<string>([key(start)]);
  const queue: Spot[] = [start];
  while (queue.length) {
    const here = queue.shift()!;
    for (const [dr, dc] of NEIGHBOURS) {
      const next = { row: here.row + dr, col: here.col + dc };
      const tile = map.rows[next.row]?.[next.col];
      if (!tile || tile === "tree" || seen.has(key(next)) || blocked.has(key(next))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return seen;
}

/** Loose treasure, richer further along the road. */
function treasureFor(stageNumber: number, rng: () => number): Treasure {
  const roll = rng();
  if (roll < 0.14) return { itemId: "kinnie", quantity: 1 };
  if (roll < 0.3) return { gold: 60 + stageNumber * 25 };
  if (roll < 0.45) return { itemId: stageNumber > 8 ? "melitan_ball" : "festa_trap", quantity: 1 };
  if (roll < 0.65) return { itemId: stageNumber > 10 ? "ftira_biz_zejt" : "qassata", quantity: 1 };
  if (roll < 0.82) return { itemId: "greca_trap", quantity: 2 };
  return { itemId: "pastizz", quantity: 2 };
}

const cache = new Map<string, MapFeatures>();

export function featuresForZone(zoneId: string): MapFeatures {
  const cached = cache.get(zoneId);
  if (cached) return cached;
  const built = buildFeatures(zoneId);
  cache.set(zoneId, built);
  return built;
}

function buildFeatures(zoneId: string): MapFeatures {
  const stage = getStage(zoneId);
  const map = getMap(zoneId);
  if (!stage) return { npcs: [], portal: null, glints: [], cage: null, story: [] };
  const rng = makeRng(seedFrom(`${zoneId}:features`));

  // Tiles already spoken for: gates, the chapel, trainers, and the tiles right beside the
  // gates — nothing should crowd the way in or out.
  const taken = new Set<string>();
  map.rows.forEach((row, r) =>
    row.forEach((tile, c) => {
      if (tile === "entrance" || tile === "exit" || tile === "heal") {
        taken.add(key({ row: r, col: c }));
        for (const [dr, dc] of NEIGHBOURS) taken.add(key({ row: r + dr, col: c + dc }));
      }
    })
  );
  const blockers = new Set(trainersForZone(zoneId).map((t) => key(t.position)));
  for (const b of blockers) taken.add(b);

  const tileAt = (s: Spot) => map.rows[s.row]?.[s.col];
  const besideRoad = (s: Spot) => NEIGHBOURS.some(([dr, dc]) => tileAt({ row: s.row + dr, col: s.col + dc }) === "path");
  const cells: Spot[] = [];
  map.rows.forEach((row, r) => row.forEach((tile, c) => tile !== "tree" && cells.push({ row: r, col: c })));

  /** Stands a blocking figure somewhere, only if the whole map stays reachable around it. */
  const everythingReachable = (extraBlock: Set<string>) => {
    const reach = reachableFrom(map, map.playerStart, extraBlock);
    return cells.every((s) => extraBlock.has(key(s)) || reach.has(key(s)));
  };
  const pick = (candidates: Spot[], blocking: boolean): Spot | null => {
    const pool = candidates.filter((s) => !taken.has(key(s)));
    while (pool.length) {
      const [spot] = pool.splice(Math.floor(rng() * pool.length), 1);
      if (blocking && !everythingReachable(new Set([...blockers, key(spot)]))) continue;
      taken.add(key(spot));
      if (blocking) blockers.add(key(spot));
      return spot;
    }
    return null;
  };

  const cols = map.rows[0].length;
  const offRoad = cells.filter((s) => tileAt(s) !== "path" && besideRoad(s));

  // Quest-giver: by the road, in the first half of the zone so you meet them on the way in.
  const npcs: MapNpc[] = [];
  const quest: QuestDef | undefined = questGivenIn(zoneId);
  if (quest) {
    const spot = pick(offRoad.filter((s) => s.col >= 3 && s.col <= Math.floor(cols / 2) + 1), true) ?? pick(offRoad, true);
    if (spot) npcs.push({ questId: quest.id, ...spot });
  }

  // The way into a hidden area: a jetty on the water, or a stone gate, off to the side.
  let portal: MapPortal | null = null;
  const bonus = bonusStageFrom(zoneId);
  if (bonus?.bonus) {
    const { portal: kind, keyItemId } = bonus.bonus;
    const prefer = offRoad.filter((s) => s.col >= Math.floor(cols / 2) && (kind === "dock" ? tileAt(s) === "water" : true));
    const spot = pick(prefer, false) ?? pick(offRoad, false);
    if (spot) portal = { toZoneId: bonus.id, keyItemId, kind, ...spot };
  }

  // Glints sit out in the terrain, away from the road, so finding one means leaving it.
  const reach = reachableFrom(map, map.playerStart, blockers);
  const inTheWild = cells.filter((s) => tileAt(s) !== "path" && !besideRoad(s) && reach.has(key(s)));
  const glints: MapGlint[] = [];
  for (const q of QUESTS) {
    for (const step of q.steps) {
      if (step.kind !== "find" || step.zoneId !== zoneId) continue;
      const spot = pick(inTheWild, false);
      if (spot) glints.push({ findId: step.findId, ...spot });
    }
  }
  const treasureCount = stage.bonus ? 3 : 1 + (stage.stage % 2);
  for (let i = 0; i < treasureCount; i++) {
    const spot = pick(inTheWild, false);
    if (spot) glints.push({ findId: `${zoneId}:treasure:${i}`, ...spot, treasure: treasureFor(stage.stage, rng) });
  }

  // The Gaġġa goes by the road near the chapel, so it is on the way in. Placed last, so adding
  // it did not move anything placed before it.
  const cage = pick(offRoad.filter((s) => s.col <= 6), false) ?? pick(offRoad, false);

  // Story characters stand by the road in the second half of the zone, so you meet them on the
  // way through. Placed after everything else, so they never move what was already there.
  const story: MapFeatures["story"] = [];
  for (const battle of storyBattlesIn(zoneId)) {
    const spot = pick(offRoad.filter((s) => s.col >= Math.floor(cols / 2) - 1 && s.col <= cols - 4), true) ?? pick(offRoad, true);
    if (spot) story.push({ battleId: battle.id, ...spot });
  }

  return { npcs, portal, glints, cage, story };
}

export function storyAt(zoneId: string, row: number, col: number): string | undefined {
  return featuresForZone(zoneId).story.find((s) => s.row === row && s.col === col)?.battleId;
}

export function cageAt(zoneId: string, row: number, col: number): boolean {
  const cage = featuresForZone(zoneId).cage;
  return !!cage && cage.row === row && cage.col === col;
}

export function npcAt(zoneId: string, row: number, col: number): MapNpc | undefined {
  return featuresForZone(zoneId).npcs.find((n) => n.row === row && n.col === col);
}

export function glintAt(zoneId: string, row: number, col: number): MapGlint | undefined {
  return featuresForZone(zoneId).glints.find((g) => g.row === row && g.col === col);
}

/** Where the way into a hidden area stands in the zone it is reached from — where you land
 * when you come back out. */
export function portalInto(bonusZoneId: string): MapPortal | null {
  const bonus = BONUS_STAGES.find((s) => s.id === bonusZoneId)?.bonus;
  return bonus ? featuresForZone(bonus.fromZoneId).portal : null;
}
