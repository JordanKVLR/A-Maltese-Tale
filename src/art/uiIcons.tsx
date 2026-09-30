import Svg, { Circle, G, Path, Rect } from "react-native-svg";

/**
 * Small line icons for the interface, so a control can say what it is in a glance instead of
 * a sentence: power, accuracy, uses, and the battle's actions.
 */
export type UiIconName = "power" | "accuracy" | "pp" | "crux" | "trap" | "party" | "item" | "run" | "lock" | "info" | "release";

export function UiIcon({ name, size = 16, color = "#1d2a36" }: { name: UiIconName; size?: number; color?: string }) {
  const line = { stroke: color, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "power" && <Path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" fill={color} />}
      {name === "accuracy" && (
        <G>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Circle cx={12} cy={12} r={4.5} {...line} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
        </G>
      )}
      {name === "pp" && (
        <G>
          <Rect x={4} y={7} width={14} height={10} rx={2} {...line} />
          <Path d="M20 10.5 V13.5" {...line} />
          <Path d="M7 10 V14 M10.5 10 V14" {...line} />
        </G>
      )}
      {name === "crux" && (
        // The Maltese cross — the eight points of the Knights' badge.
        <Path d="M12 12 L6 3 L12 6 L18 3 Z M12 12 L21 6 L18 12 L21 18 Z M12 12 L18 21 L12 18 L6 21 Z M12 12 L3 18 L6 12 L3 6 Z" fill={color} />
      )}
      {name === "trap" && (
        <G>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Path d="M3 12 H21" {...line} />
          <Circle cx={12} cy={12} r={3} {...line} fill="#ffffff" />
        </G>
      )}
      {name === "party" && (
        <G fill={color}>
          <Circle cx={12} cy={16} r={5} />
          <Circle cx={5} cy={10} r={2.4} />
          <Circle cx={9} cy={5.5} r={2.4} />
          <Circle cx={15} cy={5.5} r={2.4} />
          <Circle cx={19} cy={10} r={2.4} />
        </G>
      )}
      {name === "item" && (
        <G>
          <Rect x={4} y={8} width={16} height={13} rx={3} {...line} />
          <Path d="M9 8 Q9 3 12 3 Q15 3 15 8 M4 12 H20" {...line} />
        </G>
      )}
      {name === "run" && (
        <G>
          <Circle cx={15} cy={4} r={2.2} fill={color} />
          <Path d="M13 8 L9 12 L13 14 L11 21 M13 8 L16 12 L20 12 M9 12 L5 11 M13 14 L17 18" {...line} />
        </G>
      )}
      {name === "lock" && (
        <G>
          <Rect x={5} y={11} width={14} height={10} rx={2} {...line} />
          <Path d="M8 11 V8 Q8 4 12 4 Q16 4 16 8 V11" {...line} />
        </G>
      )}
      {name === "release" && (
        // An open door with an arrow leaving it.
        <G>
          <Path d="M10 4 H5 V20 H10" {...line} />
          <Path d="M9 12 H21 M17 8 L21 12 L17 16" {...line} />
        </G>
      )}
      {name === "info" && (
        <G>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Path d="M12 11 V17" {...line} />
          <Circle cx={12} cy={7.5} r={1.4} fill={color} />
        </G>
      )}
    </Svg>
  );
}
