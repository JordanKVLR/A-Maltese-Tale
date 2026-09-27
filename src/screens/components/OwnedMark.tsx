import Svg, { Circle, Path } from "react-native-svg";

/**
 * A tiny Greca Trap: filled when you have owned this species, an outline when you have only
 * seen it. It sits next to a wild creature's name in battle and on every Codex entry, so you
 * can tell at a glance whether a catch would be new.
 */
export function OwnedMark({ owned, size = 14, testID }: { owned: boolean; size?: number; testID?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID} accessibilityLabel={owned ? "owned" : "not owned"}>
      <Circle cx={12} cy={12} r={10} fill={owned ? "#c98a1f" : "none"} stroke={owned ? "#8a5a08" : "#9aa3aa"} strokeWidth={2} />
      <Path d="M2 12 H22" stroke={owned ? "#fff3d6" : "#9aa3aa"} strokeWidth={2} />
      <Circle cx={12} cy={12} r={3.5} fill={owned ? "#fff3d6" : "#ffffff"} stroke={owned ? "#8a5a08" : "#9aa3aa"} strokeWidth={2} />
    </Svg>
  );
}
