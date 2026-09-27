import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Polygon, Rect } from "react-native-svg";

/**
 * Madum: the patterned cement tiles on the floors of old Maltese town houses. Each design is
 * drawn on a 100×100 square so that neighbouring tiles join up — the quarter circles in the
 * corners become whole circles, the edge motifs meet their twins — exactly as a real floor
 * does. The menus use them as buttons, borders and faint backdrops.
 */

export type MadumPatternName = "star" | "quatrefoil" | "rosette" | "lozenge";

export interface MadumPalette {
  ground: string;
  primary: string;
  secondary: string;
  accent: string;
}

/** The colours of old madum: cream ground, Maltese blue, terracotta, ochre, luzzu green. */
export const MADUM: Record<"blue" | "terracotta" | "green" | "ochre" | "slate", MadumPalette> = {
  blue: { ground: "#f4ecd8", primary: "#1f4e8c", secondary: "#8fb3d4", accent: "#e0a53a" },
  terracotta: { ground: "#f4ecd8", primary: "#b9472f", secondary: "#e7b25a", accent: "#2b5d8f" },
  green: { ground: "#f4ecd8", primary: "#2e7d5b", secondary: "#a7cbb0", accent: "#b9472f" },
  ochre: { ground: "#f7efdc", primary: "#c98a1f", secondary: "#2b5d8f", accent: "#b9472f" },
  slate: { ground: "#eef0ee", primary: "#3d4a57", secondary: "#a3b0bb", accent: "#e0a53a" },
};

/** The shapes of one tile, in a 100×100 box, ready to drop into any <Svg> or <Pattern>. */
export function MadumShapes({ pattern, palette: p }: { pattern: MadumPatternName; palette: MadumPalette }) {
  switch (pattern) {
    case "star":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={p.ground} />
          {[
            [0, 0],
            [100, 0],
            [0, 100],
            [100, 100],
          ].map(([x, y]) => (
            <G key={`${x}${y}`}>
              <Circle cx={x} cy={y} r={24} fill={p.secondary} />
              <Circle cx={x} cy={y} r={12} fill={p.ground} />
            </G>
          ))}
          <Rect x={25} y={25} width={50} height={50} fill={p.primary} />
          <Polygon points="50,12 88,50 50,88 12,50" fill={p.primary} />
          <Polygon points="50,24 76,50 50,76 24,50" fill={p.ground} />
          <Circle cx={50} cy={50} r={10} fill={p.accent} />
          <Rect x={0.5} y={0.5} width={99} height={99} fill="none" stroke={p.primary} strokeOpacity={0.25} strokeWidth={1} />
        </G>
      );
    case "quatrefoil":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={p.ground} />
          <Path d="M0 0 H22 L0 22 Z M100 0 V22 L78 0 Z M0 100 V78 L22 100 Z M100 100 H78 L100 78 Z" fill={p.secondary} />
          {[
            [50, 29],
            [71, 50],
            [50, 71],
            [29, 50],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={17} fill={p.primary} />
          ))}
          <Polygon points="50,33 67,50 50,67 33,50" fill={p.ground} />
          <Circle cx={50} cy={50} r={7} fill={p.accent} />
          {[
            [50, 0],
            [100, 50],
            [50, 100],
            [0, 50],
          ].map(([x, y]) => (
            <Circle key={`e${x}${y}`} cx={x} cy={y} r={6} fill={p.accent} />
          ))}
        </G>
      );
    case "rosette":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={p.ground} />
          <Circle cx={50} cy={50} r={40} fill={p.secondary} />
          <Circle cx={50} cy={50} r={34} fill={p.ground} />
          {Array.from({ length: 8 }, (_, i) => (
            <Ellipse key={i} cx={50} cy={31} rx={7} ry={15} fill={p.primary} transform={`rotate(${i * 45} 50 50)`} />
          ))}
          <Circle cx={50} cy={50} r={9} fill={p.accent} />
          <Path d="M0 0 L14 0 L0 14 Z M100 0 L86 0 L100 14 Z M0 100 L0 86 L14 100 Z M100 100 L100 86 L86 100 Z" fill={p.primary} />
        </G>
      );
    case "lozenge":
      return (
        <G>
          <Rect x={0} y={0} width={100} height={100} fill={p.ground} />
          <Polygon points="50,4 96,50 50,96 4,50" fill={p.primary} />
          <Polygon points="50,20 80,50 50,80 20,50" fill={p.ground} />
          <Polygon points="50,32 68,50 50,68 32,50" fill={p.secondary} />
          <Rect x={44} y={44} width={12} height={12} fill={p.accent} transform="rotate(45 50 50)" />
          {[
            [0, 0],
            [100, 0],
            [0, 100],
            [100, 100],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={14} fill={p.accent} />
          ))}
        </G>
      );
  }
}

/** One tile, on its own. */
export function MadumTile({ size, pattern, palette }: { size: number; pattern: MadumPatternName; palette: MadumPalette }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <MadumShapes pattern={pattern} palette={palette} />
    </Svg>
  );
}

/**
 * A floor of tiles filling whatever it is placed in — a card's backdrop, a border strip.
 * Drawn as a single SVG pattern fill, so a whole screen of tiles costs one shape.
 */
export function MadumFloor({
  pattern,
  palette,
  tile = 48,
  opacity = 1,
}: {
  pattern: MadumPatternName;
  palette: MadumPalette;
  tile?: number;
  opacity?: number;
}) {
  const id = `madum-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0 }} opacity={opacity} pointerEvents="none">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={tile} height={tile}>
          <G transform={`scale(${tile / 100})`}>
            <MadumShapes pattern={pattern} palette={palette} />
          </G>
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Festa bunting: a string of little pennants in the colours strung across village streets. */
export function Bunting({ width, height = 22 }: { width: number; height?: number }) {
  const colours = ["#c8102e", "#ffffff", "#1f4e8c", "#e0a53a", "#2e7d5b"];
  const flag = 18;
  const count = Math.max(1, Math.floor(width / flag));
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={`M0 3 Q${width / 2} 9 ${width} 3`} stroke="#6b5a45" strokeWidth={1.2} fill="none" />
      {Array.from({ length: count }, (_, i) => {
        const x = i * flag + 1;
        const sag = 3 + Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 5;
        return (
          <Polygon
            key={i}
            points={`${x},${sag} ${x + flag - 3},${sag} ${x + (flag - 3) / 2},${sag + height - 8}`}
            fill={colours[i % colours.length]}
            stroke="#00000022"
            strokeWidth={0.6}
          />
        );
      })}
    </Svg>
  );
}

export type MenuIconName = "explore" | "party" | "codex" | "bag" | "quests" | "shop" | "help" | "settings" | "music";

/** Simple line icons for the menu, in the same ink as the tiles. */
export function MenuIcon({ name, size = 28, color = "#1d2a36" }: { name: MenuIconName; size?: number; color?: string }) {
  const stroke = { stroke: color, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {name === "explore" && (
        // The eye of Osiris painted on every luzzu's prow — it watches the way ahead.
        <G>
          <Path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" {...stroke} />
          <Circle cx={24} cy={24} r={7} fill={color} />
          <Path d="M24 34 Q22 42 14 44" {...stroke} />
        </G>
      )}
      {name === "party" && (
        <G fill={color}>
          <Ellipse cx={24} cy={31} rx={10} ry={8} />
          <Circle cx={11} cy={20} r={4.5} />
          <Circle cx={19} cy={12} r={4.5} />
          <Circle cx={29} cy={12} r={4.5} />
          <Circle cx={37} cy={20} r={4.5} />
        </G>
      )}
      {name === "codex" && (
        <G>
          <Path d="M24 13 Q15 7 6 10 V38 Q15 35 24 41 Z" {...stroke} />
          <Path d="M24 13 Q33 7 42 10 V38 Q33 35 24 41 Z" {...stroke} />
        </G>
      )}
      {name === "bag" && (
        <G>
          <Rect x={8} y={17} width={32} height={24} rx={5} {...stroke} />
          <Path d="M8 22 H40 M20 22 V28 H28 V22" {...stroke} />
          <Path d="M16 17 Q16 7 24 7 Q32 7 32 17" {...stroke} />
        </G>
      )}
      {name === "quests" && (
        <G>
          <Path d="M12 8 H36 Q40 8 40 12 V40 H16 Q12 40 12 36 Z" {...stroke} />
          <Path d="M12 36 Q12 44 20 40 M18 16 H33 M18 23 H33 M18 30 H28" {...stroke} />
        </G>
      )}
      {name === "shop" && (
        <G>
          <Path d="M6 18 L10 8 H38 L42 18 Z" {...stroke} />
          <Path d="M6 18 Q10 23 15 18 Q19 23 24 18 Q29 23 33 18 Q38 23 42 18" {...stroke} />
          <Path d="M10 22 V40 H38 V22 M20 40 V30 H28 V40" {...stroke} />
        </G>
      )}
      {name === "help" && (
        <G>
          <Circle cx={24} cy={24} r={18} {...stroke} />
          <Path d="M18 19 Q18 12 24 12 Q30 12 30 18 Q30 23 24 25 V29" {...stroke} />
          <Circle cx={24} cy={35} r={2.2} fill={color} />
        </G>
      )}
      {name === "settings" && (
        <G>
          <Circle cx={24} cy={24} r={7} {...stroke} />
          {Array.from({ length: 8 }, (_, i) => (
            <Path key={i} d="M24 6 V12" {...stroke} transform={`rotate(${i * 45} 24 24)`} />
          ))}
          <Circle cx={24} cy={24} r={13} {...stroke} />
        </G>
      )}
      {name === "music" && (
        <G>
          <Path d="M18 36 V10 L38 6 V32" {...stroke} />
          <Ellipse cx={13} cy={36} rx={5.5} ry={4.5} fill={color} />
          <Ellipse cx={33} cy={32} rx={5.5} ry={4.5} fill={color} />
        </G>
      )}
    </Svg>
  );
}
