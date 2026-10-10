import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { PEOPLE_SVG } from "./people/sprites.generated";
import { HandDrawn } from "./handDrawn";
import { world } from "../screens/theme";
import type { TileType } from "../game/mapData";

/**
 * Overworld tiles are drawn rather than colour-filled: grass gets tufts and the odd flower,
 * trees get a trunk and a layered canopy with a contact shadow, stone gets cut blocks. The
 * decoration is placed from a per-tile seed (row/col), so a field of grass looks varied but
 * never reshuffles between renders.
 *
 * Everything is a 0..100 viewBox scaled to TILE_SIZE, so tiles stay crisp at any zoom.
 */

/** Cheap deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * `tall` is the encounter state: walking into it can start a battle, so it has to be obvious
 * at a glance. Tall grass is darker and thick with blades; short grass (used as the ground
 * under trees) is light and sparse, so the two never get confused.
 */
function GrassBase({ seed, tall = false }: { seed: number; tall?: boolean }) {
  const count = tall ? 7 : 3;
  const blades = Array.from({ length: count }, (_, i) => ({
    x: 8 + rand(seed, i * 3 + 1) * 84,
    y: (tall ? 46 : 34) + rand(seed, i * 3 + 2) * (tall ? 52 : 56),
    s: (tall ? 1.15 : 0.75) + rand(seed, i * 3 + 3) * 0.55,
  }));
  const flower = !tall && rand(seed, 9) > 0.82;
  return (
    <G>
      <Rect x={0} y={0} width={100} height={100} fill={tall ? world.grassDark : world.grass} />
      <Rect x={0} y={0} width={100} height={52} fill={tall ? world.grass : world.grassLight} opacity={0.55} />
      {blades.map((t, i) => (
        <Path
          key={i}
          d={`M${t.x} ${t.y} l${-5 * t.s} ${-9 * t.s} M${t.x} ${t.y} l0 ${-13 * t.s} M${t.x} ${t.y} l${5 * t.s} ${-9 * t.s}`}
          stroke={tall ? world.grassLight : world.tuft}
          strokeWidth={tall ? 3.6 : 3.2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {flower && (
        <G>
          <Circle cx={22 + rand(seed, 11) * 55} cy={30 + rand(seed, 12) * 50} r={4.2} fill="#fff6d8" />
          <Circle cx={22 + rand(seed, 11) * 55} cy={30 + rand(seed, 12) * 50} r={1.6} fill={world.sunHaze} />
        </G>
      )}
    </G>
  );
}

function TileArtInner({ type, seed }: { type: TileType; seed: number }) {
  switch (type) {
    case "grass":
      return <GrassBase seed={seed} tall />;

    case "tree": {
      const lean = (rand(seed, 21) - 0.5) * 8;
      return (
        <G>
          <GrassBase seed={seed + 7} />
          <Ellipse cx={50 + lean} cy={84} rx={26} ry={7} fill={world.shadowSoft} />
          <Rect x={44 + lean} y={56} width={13} height={26} rx={4} fill={world.treeTrunk} stroke={world.treeTrunkDark} strokeWidth={2} />
          <Circle cx={32 + lean} cy={46} r={21} fill={world.treeCanopyDark} />
          <Circle cx={68 + lean} cy={48} r={20} fill={world.treeCanopyDark} />
          <Circle cx={50 + lean} cy={34} r={25} fill={world.treeCanopy} />
          <Circle cx={40 + lean} cy={40} r={19} fill={world.treeCanopy} />
          <Circle cx={62 + lean} cy={38} r={17} fill={world.treeCanopyLight} opacity={0.85} />
          <Circle cx={42 + lean} cy={26} r={9} fill={world.treeCanopyLight} opacity={0.7} />
        </G>
      );
    }

    case "path": {
      const pebbles = [0, 1, 2].map((i) => ({
        x: 14 + rand(seed, i + 30) * 72,
        y: 14 + rand(seed, i + 40) * 72,
        r: 2.6 + rand(seed, i + 50) * 2.4,
      }));
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.path} />
          <Rect x={0} y={0} width={100} height={46} fill={world.pathLight} opacity={0.6} />
          {pebbles.map((p, i) => (
            <Ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.72} fill={world.pathDark} opacity={0.4} />
          ))}
        </G>
      );
    }

    /**
     * Karst outcrop: weathered globigerina boulders sitting in dry scrub, not cut blocks —
     * the rubble-strewn garrigue you actually walk over inland.
     */
    case "rock": {
      const j = (n: number) => (rand(seed, n) - 0.5) * 10;
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.limestoneLight} />
          <Path d="M0 62 q26 -9 50 0 q24 9 50 0 l0 38 l-100 0 z" fill={world.limestone} opacity={0.75} />
          <Ellipse cx={30 + j(1)} cy={70} rx={26} ry={9} fill={world.shadowSoft} />
          <Ellipse cx={72 + j(2)} cy={48} rx={20} ry={7} fill={world.shadowSoft} />
          <Path
            d={`M${8 + j(3)} 66 q2 -26 24 -26 q22 0 24 26 q-24 8 -48 0 z`}
            fill={world.limestone}
            stroke={world.limestoneShadow}
            strokeWidth={2.4}
          />
          <Path d={`M${14 + j(3)} 56 q14 -12 30 -4`} stroke={world.limestoneLight} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} />
          <Path
            d={`M${54 + j(4)} 46 q3 -20 19 -20 q17 0 19 20 q-19 7 -38 0 z`}
            fill={world.limestoneDark}
            stroke={world.limestoneShadow}
            strokeWidth={2.3}
          />
          <Path
            d={`M${50 + j(5)} 90 q3 -16 16 -16 q14 0 16 16 q-16 6 -32 0 z`}
            fill={world.limestone}
            stroke={world.limestoneShadow}
            strokeWidth={2.2}
          />
          <Circle cx={18 + j(6)} cy={88} r={3.4} fill={world.limestoneDark} opacity={0.8} />
        </G>
      );
    }

    case "water": {
      const off = rand(seed, 71) * 20;
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.sea} />
          <Rect x={0} y={56} width={100} height={44} fill={world.seaDeep} opacity={0.55} />
          <Path d={`M${6 + off} 30 q10 -7 20 0 q10 7 20 0`} stroke={world.seaFoam} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d={`M${36 - off} 66 q10 -7 20 0 q10 7 20 0`} stroke={world.seaShallow} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.9} />
        </G>
      );
    }

    case "sand": {
      const dots = [0, 1, 2, 3].map((i) => ({
        x: 10 + rand(seed, i + 80) * 80,
        y: 12 + rand(seed, i + 90) * 76,
      }));
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.sand} />
          <Path d="M0 58 q25 -10 50 0 q25 10 50 0 l0 42 l-100 0 z" fill={world.sandDark} opacity={0.5} />
          {dots.map((d, i) => (
            <Circle key={i} cx={d.x} cy={d.y} r={2} fill={world.sandDark} opacity={0.65} />
          ))}
        </G>
      );
    }

    /** Wayside chapel — the islands' own version of a place you stop and recover. */
    case "heal":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.limestoneLight} />
          <Rect x={0} y={0} width={100} height={100} fill={world.pathLight} opacity={0.5} />
          <Ellipse cx={50} cy={86} rx={28} ry={6} fill={world.shadowSoft} />
          <Rect x={24} y={44} width={52} height={42} rx={3} fill={world.limestone} stroke={world.limestoneShadow} strokeWidth={2.6} />
          <Path d="M20 46 l30 -24 l30 24 z" fill={world.terracotta} stroke={world.terracottaDark} strokeWidth={2.6} />
          <Rect x={43} y={62} width={14} height={24} rx={2} fill={world.limestoneShadow} />
          <Path d="M50 6 l0 16 M43 13 l14 0" stroke="#e05252" strokeWidth={5} strokeLinecap="round" />
        </G>
      );

    /** City gate arch — you walk through it to the zone you came from. */
    case "entrance":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.path} />
          <Ellipse cx={50} cy={88} rx={30} ry={6} fill={world.shadowSoft} />
          <Rect x={12} y={26} width={18} height={60} rx={3} fill={world.limestone} stroke={world.limestoneShadow} strokeWidth={2.6} />
          <Rect x={70} y={26} width={18} height={60} rx={3} fill={world.limestone} stroke={world.limestoneShadow} strokeWidth={2.6} />
          <Path d="M12 30 q38 -22 76 0 l0 -10 q-38 -20 -76 0 z" fill={world.limestoneDark} stroke={world.limestoneShadow} strokeWidth={2.4} />
          <Path d="M30 86 q20 -44 40 0 z" fill="#3c3126" opacity={0.85} />
        </G>
      );

    /** The way onward — same arch, lit warm so it reads as "forward", not "back". */
    case "exit":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={world.pathLight} />
          <Ellipse cx={50} cy={88} rx={30} ry={6} fill={world.shadowSoft} />
          <Rect x={12} y={26} width={18} height={60} rx={3} fill={world.limestoneLight} stroke={world.limestoneDark} strokeWidth={2.6} />
          <Rect x={70} y={26} width={18} height={60} rx={3} fill={world.limestoneLight} stroke={world.limestoneDark} strokeWidth={2.6} />
          <Path d="M12 30 q38 -22 76 0 l0 -10 q-38 -20 -76 0 z" fill="#f0c674" stroke={world.limestoneDark} strokeWidth={2.4} />
          <Path d="M30 86 q20 -44 40 0 z" fill="#ffe9b0" opacity={0.95} />
          <Circle cx={50} cy={60} r={7} fill="#fff3cf" opacity={0.85} />
        </G>
      );

    default:
      return <Rect x={0} y={0} width={100} height={100} fill={world.grass} />;
  }
}

export function TileArt({ type, seed, size }: { type: TileType; seed: number; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <TileArtInner type={type} seed={seed} />
    </Svg>
  );
}

/**
 * An NPC trainer waiting on the road. Deliberately a different silhouette from the player —
 * no straw hat, a shoulder cape — and gym leaders get a medal badge above them so you can
 * see the boss fight coming from across the map.
 */
export function TrainerSprite({
  size,
  isGymLeader,
  defeated,
}: {
  size: number;
  isGymLeader?: boolean;
  defeated?: boolean;
}) {
  const drawn = PEOPLE_SVG[isGymLeader ? "trainer-leader" : "trainer"];
  if (drawn) {
    return (
      <View style={{ width: size, height: size }}>
        <HandDrawn xml={drawn} size={size} opacity={defeated ? 0.45 : 1} />
        {isGymLeader && !defeated && (
          <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>
            <Circle cx={50} cy={11} r={9} fill="#f3c14a" stroke="#b98a16" strokeWidth={2} />
            <Path d="M50 5 l2 4 h4 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 h4 z" fill="#fff6d8" />
          </Svg>
        )}
      </View>
    );
  }
  const coat = isGymLeader ? "#8d6bb5" : "#3f7b8a";
  const coatDark = isGymLeader ? "#6a4d90" : "#2d5d69";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={defeated ? 0.45 : 1}>
      <Ellipse cx={50} cy={90} rx={20} ry={5} fill="rgba(35,60,45,0.28)" />
      <Rect x={41} y={70} width={8} height={16} rx={3.5} fill="#43484f" />
      <Rect x={52} y={70} width={8} height={16} rx={3.5} fill="#353a40" />
      <Path d="M35 50 q15 -7 30 0 l5 22 q-20 6 -40 0 z" fill={coat} stroke={coatDark} strokeWidth={2.2} />
      <Path d="M35 50 q15 8 30 0 l3 9 q-18 7 -36 0 z" fill={coatDark} opacity={0.75} />
      <Rect x={27} y={52} width={8} height={18} rx={4} fill={coat} stroke={coatDark} strokeWidth={2} />
      <Rect x={65} y={52} width={8} height={18} rx={4} fill={coat} stroke={coatDark} strokeWidth={2} />
      <Circle cx={50} cy={37} r={16} fill="#f0c9a0" stroke="#c99a70" strokeWidth={2} />
      <Circle cx={44} cy={38} r={3} fill="#2b3a44" />
      <Circle cx={56} cy={38} r={3} fill="#2b3a44" />
      <Path d="M34 33 q16 -16 32 0 q-6 -12 -16 -12 q-10 0 -16 12 z" fill="#4a3524" />
      {defeated ? (
        <Path d="M42 46 q8 -5 16 0" stroke="#a8724c" strokeWidth={2} fill="none" strokeLinecap="round" />
      ) : (
        <Path d="M44 45 q6 5 12 0" stroke="#a8724c" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {isGymLeader && !defeated && (
        <G>
          <Circle cx={50} cy={11} r={9} fill="#f3c14a" stroke="#b98a16" strokeWidth={2} />
          <Path d="M50 5 l2 4 h4 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 h4 z" fill="#fff6d8" />
        </G>
      )}
    </Svg>
  );
}

/**
 * The player: a small figure in a wide straw hat (the żappa hat worn in the fields), drawn
 * from four angles so movement reads directionally instead of as a sliding token.
 */
export function PlayerSprite({ facing, size }: { facing: "up" | "down" | "left" | "right"; size: number }) {
  const drawn = PEOPLE_SVG[facing === "up" ? "player-up" : facing === "down" ? "player-down" : "player-side"];
  // The side view is drawn facing right; walking left mirrors it.
  if (drawn) return <HandDrawn xml={drawn} size={size} mirrored={facing === "left"} />;
  const skin = "#f0c9a0";
  const shirt = "#e0574f";
  const hat = "#eddaa8";
  const hatBand = "#c96b47";
  const hair = "#4a3524";
  const profile = facing === "left" || facing === "right";
  const flip = facing === "left";

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform={flip ? "translate(100,0) scale(-1,1)" : undefined}>
        <Ellipse cx={50} cy={90} rx={20} ry={5} fill="rgba(35,60,45,0.28)" />
        {/* legs */}
        <Rect x={41} y={70} width={8} height={16} rx={3.5} fill="#3f6b8a" />
        <Rect x={52} y={70} width={8} height={16} rx={3.5} fill="#325873" />
        {/* body */}
        <Path d="M36 50 q14 -6 28 0 l4 22 q-18 6 -36 0 z" fill={shirt} stroke="#a83c36" strokeWidth={2.2} />
        {/* arms */}
        <Rect x={29} y={52} width={8} height={18} rx={4} fill={shirt} stroke="#a83c36" strokeWidth={2} />
        <Rect x={63} y={52} width={8} height={18} rx={4} fill={shirt} stroke="#a83c36" strokeWidth={2} />
        {/* head */}
        <Circle cx={50} cy={38} r={16} fill={skin} stroke="#c99a70" strokeWidth={2} />
        {facing === "up" ? (
          <Path d="M35 36 q15 -12 30 0 q-4 10 -15 10 q-11 0 -15 -10 z" fill={hair} />
        ) : (
          <G>
            {profile ? (
              <G>
                <Circle cx={60} cy={39} r={3} fill="#2b3a44" />
                <Path d="M64 46 q4 2 6 -1" stroke="#a8724c" strokeWidth={1.8} fill="none" strokeLinecap="round" />
              </G>
            ) : (
              <G>
                <Circle cx={43} cy={39} r={3} fill="#2b3a44" />
                <Circle cx={57} cy={39} r={3} fill="#2b3a44" />
                <Path d="M45 47 q5 4 10 0" stroke="#a8724c" strokeWidth={2} fill="none" strokeLinecap="round" />
              </G>
            )}
          </G>
        )}
        {/* straw hat */}
        <Ellipse cx={50} cy={27} rx={26} ry={8} fill={hat} stroke="#c9ab6b" strokeWidth={2.2} />
        <Path d="M36 26 q2 -14 14 -14 q12 0 14 14 z" fill={hat} stroke="#c9ab6b" strokeWidth={2.2} />
        <Path d="M36 24 q14 -6 28 0" stroke={hatBand} strokeWidth={4} fill="none" />
      </G>
    </Svg>
  );
}

export type NpcLook = "herbalist" | "archivist" | "fisher" | "sacristan";

const NPC_COLOURS: Record<NpcLook, { coat: string; dark: string; head: string }> = {
  herbalist: { coat: "#6f8f3a", dark: "#4f6a24", head: "#e8e2d6" },
  archivist: { coat: "#9a4a3a", dark: "#6e3022", head: "#3a2a1a" },
  fisher: { coat: "#2f6fb5", dark: "#1f4f86", head: "#f2d04a" },
  sacristan: { coat: "#2b2b36", dark: "#16161e", head: "#1d1d1d" },
};

/**
 * A quest-giver: rounder and softer than a trainer, each dressed for their trade. The mark over
 * their head says whether they have something for you: "!" for a new quest, "?" when you are
 * ready to hand one in, and nothing once you are done.
 */
export function NpcSprite({ size, look, marker }: { size: number; look: NpcLook; marker: "!" | "?" | null }) {
  const drawn = PEOPLE_SVG[`npc-${look}`];
  if (drawn) {
    return (
      <View style={{ width: size, height: size }}>
        <HandDrawn xml={drawn} size={size} />
        {marker && (
          <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>
            <NpcMarker marker={marker} />
          </Svg>
        )}
      </View>
    );
  }
  const { coat, dark, head } = NPC_COLOURS[look];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={90} rx={20} ry={5} fill="rgba(35,60,45,0.28)" />
      <Path d="M32 52 q18 -8 36 0 l6 34 q-24 6 -48 0 z" fill={coat} stroke={dark} strokeWidth={2.2} />
      <Circle cx={50} cy={40} r={15} fill="#f0c9a0" stroke="#c99a70" strokeWidth={2} />
      <Circle cx={44} cy={41} r={2.6} fill="#2b3a44" />
      <Circle cx={56} cy={41} r={2.6} fill="#2b3a44" />
      <Path d="M44 47 q6 4 12 0" stroke="#a8724c" strokeWidth={2} fill="none" strokeLinecap="round" />
      {look === "herbalist" && <Path d="M33 40 q17 -24 34 0 q-2 -6 -17 -7 q-15 1 -17 7 z" fill={head} />}
      {look === "fisher" && <Path d="M32 32 h36 l-4 -8 h-28 z" fill={head} stroke="#b89a2a" strokeWidth={1.5} />}
      {look === "archivist" && <Path d="M35 36 q15 -18 30 0 q-6 -10 -15 -10 q-9 0 -15 10 z" fill={head} />}
      {look === "sacristan" && <Rect x={36} y={22} width={28} height={9} rx={4} fill={head} />}
      {marker && <NpcMarker marker={marker} />}
    </Svg>
  );
}

/** The "!" or "?" over a quest-giver's head. */
function NpcMarker({ marker }: { marker: "!" | "?" }) {
  return (
    <G>
      <Circle cx={50} cy={10} r={9} fill={marker === "!" ? "#f3c14a" : "#7ddba0"} stroke="#6b5a1a" strokeWidth={1.8} />
      <Path
        d={marker === "!" ? "M50 4.5 v7" : "M46.8 7.2 q3.2 -4 6.4 0 q0 2.6 -3.2 3.6 v1.4"}
        stroke="#3a2a0a"
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={50} cy={15} r={1.6} fill="#3a2a0a" />
    </G>
  );
}

/** Something glinting on the ground — a quest object or a bit of treasure. */
export function GlintSprite({ size, quest }: { size: number; quest?: boolean }) {
  const fill = quest ? "#7fe0ff" : "#ffe27a";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={66} rx={12} ry={4} fill="rgba(35,60,45,0.25)" />
      <Path d="M50 30 l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 l18 -6 z" fill={fill} stroke="#ffffff" strokeWidth={2} />
      <Circle cx={68} cy={34} r={3} fill="#ffffff" />
    </Svg>
  );
}

/** The way into a hidden area: a jetty with a boat, or a stone doorway full of fog. */
export function PortalSprite({ size, kind, open }: { size: number; kind: "dock" | "gate"; open: boolean }) {
  if (kind === "dock") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x={16} y={40} width={68} height={16} rx={2} fill="#9b7447" stroke="#6b4f2c" strokeWidth={2} />
        {[26, 42, 58, 74].map((x) => (
          <Rect key={x} x={x - 1} y={40} width={2} height={16} fill="#6b4f2c" />
        ))}
        <Path d="M24 70 q26 12 52 0 l-6 -8 h-40 z" fill="#2f6fb5" stroke="#f0c94a" strokeWidth={3} />
        {open && <Rect x={48} y={52} width={3} height={22} fill="#c9423a" transform="rotate(35 50 62)" />}
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={20} y={24} width={14} height={62} fill="#c9b48a" stroke="#8f7a52" strokeWidth={2} />
      <Rect x={66} y={24} width={14} height={62} fill="#c9b48a" stroke="#8f7a52" strokeWidth={2} />
      <Rect x={16} y={16} width={68} height={12} fill="#d6c4a0" stroke="#8f7a52" strokeWidth={2} />
      <Rect x={34} y={28} width={32} height={58} fill={open ? "rgba(255,255,255,0.12)" : "rgba(235,240,245,0.92)"} />
    </Svg>
  );
}

/** The Gaġġa: a wooden coop with an iron-barred front, the kind kept in a Maltese farmyard. */
export function CageSprite({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={88} rx={34} ry={6} fill="rgba(35,60,45,0.28)" />
      <Path d="M14 40 L50 16 L86 40 Z" fill="#b5553a" stroke="#7d3524" strokeWidth={2.5} />
      <Rect x={20} y={40} width={60} height={46} rx={3} fill="#9b7447" stroke="#6b4f2c" strokeWidth={2.5} />
      <Rect x={28} y={48} width={44} height={32} rx={2} fill="#3a2e22" />
      {[34, 42, 50, 58, 66].map((x) => (
        <Rect key={x} x={x - 1.2} y={48} width={2.4} height={32} fill="#c9c2b4" />
      ))}
      <Circle cx={50} cy={30} r={5} fill="#f3c14a" stroke="#b98a16" strokeWidth={1.5} />
    </Svg>
  );
}
