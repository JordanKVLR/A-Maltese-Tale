import type { TypeName } from "../data/schemas";

/**
 * How each element looks when it's thrown: the way it travels, what it leaves behind, what it
 * is (a glowing ball, an ice shard, a boulder...), and how it lands. Shared by the 3D scene
 * and the 2D stage, so an element reads the same either way — fire always flares and sends
 * embers up, water always splashes, rock always falls from above.
 */

export type FxPath =
  /** A gentle lob. */
  | "arc"
  /** Dead straight and quick. */
  | "straight"
  /** Jagged, like lightning. */
  | "zigzag"
  /** Rising and falling, like a wave or a gust. */
  | "wave"
  /** Corkscrewing around the line of flight. */
  | "spiral"
  /** Dropping onto the target from overhead. */
  | "fromAbove"
  /** Rippling along the ground from one to the other. */
  | "ground";

export type FxBody = "glow" | "shard" | "rock" | "leaf" | "blade" | "bubble";

export interface ElementFx {
  path: FxPath;
  body: FxBody;
  /** How many travel together (a volley of shards, a swarm). */
  count: number;
  /** Colours to pick from for trail and impact particles. */
  colors: string[];
  /** Particles trailing behind: how many per frame (0–1), and whether they rise or fall. */
  trail: { rate: number; gravity: number; size: number; life: number };
  /** The landing. */
  impact: {
    count: number;
    speed: number;
    up: number;
    gravity: number;
    size: number;
    life: number;
    /** An expanding ring on the ground under the target. */
    ring?: boolean;
    /** Camera shake, 0–1. */
    shake?: number;
    /** A bright light flash at the target. */
    flash?: boolean;
  };
  /** Dark elements are drawn over the scene rather than glowing into it. */
  dark?: boolean;
}

export const ELEMENT_FX: Record<TypeName, ElementFx> = {
  Normal: {
    path: "arc", body: "glow", count: 1, colors: ["#f2ecd8", "#ffffff"],
    trail: { rate: 0.5, gravity: 0, size: 0.16, life: 0.25 },
    impact: { count: 16, speed: 2.4, up: 0.2, gravity: 1.5, size: 0.2, life: 0.4, shake: 0.2 },
  },
  Fire: {
    path: "arc", body: "glow", count: 1, colors: ["#ff5a1f", "#ff9a2a", "#ffd34a"],
    trail: { rate: 1, gravity: -2.2, size: 0.26, life: 0.5 },
    impact: { count: 30, speed: 2.2, up: 0.8, gravity: -1.8, size: 0.3, life: 0.8, flash: true, shake: 0.25 },
  },
  Water: {
    path: "wave", body: "bubble", count: 1, colors: ["#2f8fff", "#7fc4ff", "#e6f4ff"],
    trail: { rate: 0.9, gravity: 4, size: 0.14, life: 0.45 },
    impact: { count: 34, speed: 2.4, up: 1.6, gravity: 6, size: 0.18, life: 0.7, ring: true },
  },
  Grass: {
    path: "spiral", body: "leaf", count: 3, colors: ["#3fae3a", "#8fd85a", "#d6f07a"],
    trail: { rate: 0.4, gravity: 0.6, size: 0.14, life: 0.6 },
    impact: { count: 22, speed: 1.6, up: 0.5, gravity: 0.8, size: 0.2, life: 1, ring: false },
  },
  Electric: {
    path: "zigzag", body: "glow", count: 1, colors: ["#fff35a", "#ffffff", "#ffd000"],
    trail: { rate: 1, gravity: 0, size: 0.2, life: 0.15 },
    impact: { count: 30, speed: 4, up: 0.3, gravity: 0, size: 0.16, life: 0.25, flash: true, shake: 0.35 },
  },
  Ice: {
    path: "straight", body: "shard", count: 3, colors: ["#bff2ff", "#ffffff", "#7fd8ff"],
    trail: { rate: 0.7, gravity: 0.3, size: 0.12, life: 0.4 },
    impact: { count: 26, speed: 2.8, up: 0.6, gravity: 3, size: 0.16, life: 0.6, ring: true },
  },
  Fighting: {
    path: "straight", body: "glow", count: 1, colors: ["#ff6a3a", "#ffc24a", "#ffffff"],
    trail: { rate: 0.3, gravity: 0, size: 0.14, life: 0.2 },
    impact: { count: 24, speed: 3.6, up: 0.2, gravity: 0, size: 0.24, life: 0.3, shake: 0.6, flash: true },
  },
  Poison: {
    path: "arc", body: "bubble", count: 2, colors: ["#a64ad8", "#d27aff", "#6a2a9a"],
    trail: { rate: 0.8, gravity: -0.8, size: 0.18, life: 0.7 },
    impact: { count: 22, speed: 1.1, up: 0.6, gravity: -0.9, size: 0.26, life: 1.1 },
  },
  Ground: {
    path: "ground", body: "rock", count: 1, colors: ["#b8864a", "#d9b27a", "#8a6232"],
    trail: { rate: 1, gravity: 3, size: 0.22, life: 0.5 },
    impact: { count: 34, speed: 1.8, up: 2.2, gravity: 4, size: 0.26, life: 0.8, ring: true, shake: 0.7 },
  },
  Flying: {
    path: "wave", body: "glow", count: 2, colors: ["#e8f4ff", "#b8d8ff", "#ffffff"],
    trail: { rate: 1, gravity: 0, size: 0.2, life: 0.3 },
    impact: { count: 24, speed: 3, up: 0.4, gravity: 0, size: 0.18, life: 0.45 },
  },
  Psychic: {
    path: "straight", body: "glow", count: 1, colors: ["#ff5aa8", "#ffa8d8", "#c85aff"],
    trail: { rate: 0.6, gravity: 0, size: 0.26, life: 0.5 },
    impact: { count: 14, speed: 0.8, up: 0.3, gravity: -0.3, size: 0.3, life: 0.9, ring: true, flash: true },
  },
  Bug: {
    path: "zigzag", body: "glow", count: 6, colors: ["#a8d03a", "#d8f05a", "#6a8a1a"],
    trail: { rate: 0.4, gravity: 0, size: 0.1, life: 0.25 },
    impact: { count: 18, speed: 2, up: 0.3, gravity: 0.5, size: 0.13, life: 0.5 },
  },
  Rock: {
    path: "fromAbove", body: "rock", count: 3, colors: ["#c9a86a", "#9a7a4a", "#e0cc9a"],
    trail: { rate: 0.3, gravity: 2, size: 0.14, life: 0.4 },
    impact: { count: 28, speed: 2.4, up: 1, gravity: 5, size: 0.2, life: 0.7, shake: 0.6 },
  },
  Ghost: {
    path: "spiral", body: "glow", count: 1, colors: ["#8a6ae0", "#5a3aa8", "#c8b8ff"],
    trail: { rate: 0.8, gravity: -0.5, size: 0.3, life: 0.8 },
    impact: { count: 18, speed: 0.9, up: 0.6, gravity: -0.8, size: 0.34, life: 1.1 },
  },
  Dragon: {
    path: "spiral", body: "glow", count: 1, colors: ["#6a5aff", "#ff7a3a", "#b8a8ff"],
    trail: { rate: 1, gravity: -0.6, size: 0.3, life: 0.6 },
    impact: { count: 36, speed: 3, up: 0.8, gravity: 0.5, size: 0.3, life: 0.7, flash: true, shake: 0.5, ring: true },
  },
  Dark: {
    path: "straight", body: "blade", count: 1, colors: ["#2a1a3a", "#4a3a5a", "#6a1a2a"],
    trail: { rate: 0.8, gravity: 0, size: 0.24, life: 0.4 },
    impact: { count: 22, speed: 2.6, up: 0.2, gravity: 0.5, size: 0.26, life: 0.5, shake: 0.3 },
    dark: true,
  },
  Steel: {
    path: "straight", body: "blade", count: 2, colors: ["#e8eef4", "#b8c4d0", "#ffffff"],
    trail: { rate: 0.5, gravity: 0, size: 0.12, life: 0.25 },
    impact: { count: 30, speed: 4, up: 0.6, gravity: 5, size: 0.12, life: 0.4, flash: true, shake: 0.3 },
  },
  Fairy: {
    path: "arc", body: "glow", count: 1, colors: ["#ffa8e0", "#ffffff", "#ffe08a"],
    trail: { rate: 1, gravity: 0.4, size: 0.14, life: 0.8 },
    impact: { count: 30, speed: 1.4, up: 0.8, gravity: 0.6, size: 0.16, life: 1.1, ring: true },
  },
};

/**
 * Where something following `path` is at time `t` (0→1), as an offset from the straight line
 * between the two creatures: `along` (0→1 of the way there), `up`, and `side` (to the right of
 * the line of flight). `seed` varies a volley so its members don't overlap.
 */
export function pathOffset(path: FxPath, t: number, seed = 0): { along: number; up: number; side: number } {
  const hump = Math.sin(t * Math.PI);
  switch (path) {
    case "arc":
      return { along: t, up: hump * 0.7, side: 0 };
    case "straight":
      return { along: t, up: hump * 0.08, side: 0 };
    case "zigzag": {
      // Jumps between points, fixed per seed so a frame-rate change doesn't change its shape.
      const steps = 6;
      const k = Math.floor(t * steps);
      const jitter = Math.sin((k + 1) * 12.9898 + seed * 78.233) * 0.5;
      return { along: t, up: hump * 0.2 + jitter * 0.4 * hump, side: jitter * 0.6 * hump };
    }
    case "wave":
      return { along: t, up: hump * 0.3 + Math.sin(t * Math.PI * 4 + seed) * 0.22 * hump, side: 0 };
    case "spiral": {
      const angle = t * Math.PI * 5 + seed * 2.1;
      const radius = 0.4 * hump;
      return { along: t, up: 0.2 * hump + Math.sin(angle) * radius, side: Math.cos(angle) * radius };
    }
    case "fromAbove":
      // Handled by the renderer: it falls onto the target. Returned here for completeness.
      return { along: 1, up: (1 - t) * 3.5, side: (seed - 1) * 0.35 * (1 - t) };
    case "ground":
      return { along: t, up: 0, side: 0 };
  }
}
