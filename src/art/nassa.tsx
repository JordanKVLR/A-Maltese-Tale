import Svg, { Ellipse, G, Path } from "react-native-svg";

/**
 * The nassa: the Maltese fish trap, a bottle-shaped basket woven from split cane, with a funnel
 * at its mouth that lets fish in and not out. It is what the game's traps are, so it is what
 * you see when you throw one, and the mark that shows you own a Ħarsi.
 *
 * Drawn in a 24×24 box: a rounded body narrowing to a neck, ribs running its length, weave
 * bands across it, and the open mouth at the base.
 */
export function NassaIcon({
  size = 20,
  color = "#b8863a",
  filled = true,
  line = "#6b4a1a",
  testID,
}: {
  size?: number;
  color?: string;
  /** Solid cane body, or just an outline (a species you've only seen). */
  filled?: boolean;
  line?: string;
  testID?: string;
}) {
  const stroke = { stroke: line, strokeWidth: 1.4, strokeLinecap: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <G>
        {/* Body: wide at the mouth, rounded shoulders, narrow neck at the top. */}
        <Path
          d="M4 19 Q3 11 8 7 Q10 5.5 10.5 3 H13.5 Q14 5.5 16 7 Q21 11 20 19 Z"
          fill={filled ? color : "none"}
          stroke={line}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {/* Ribs of cane running from neck to mouth. */}
        <Path d="M12 3 V19 M10.6 3.4 Q7 11 7.5 19 M13.4 3.4 Q17 11 16.5 19" {...stroke} opacity={0.8} />
        {/* Woven bands across it. */}
        <Path d="M6 10.5 Q12 12 18 10.5 M4.6 14.5 Q12 16.2 19.4 14.5" {...stroke} opacity={0.9} />
        {/* The mouth, with its funnel. */}
        <Ellipse cx={12} cy={19} rx={8} ry={2.4} fill={filled ? "#8a5f22" : "none"} stroke={line} strokeWidth={1.6} />
        <Ellipse cx={12} cy={19} rx={3.4} ry={1} fill={filled ? "#3a2810" : "none"} stroke={line} strokeWidth={1} />
      </G>
    </Svg>
  );
}
