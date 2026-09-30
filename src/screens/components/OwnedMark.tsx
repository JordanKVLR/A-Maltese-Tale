import { NassaIcon } from "../../art/nassa";

/**
 * A tiny nassa, the Maltese woven fish trap: solid cane when you have owned this Ħarsi, an
 * outline when you have only seen it. It sits next to a wild Ħarsi's name in battle and on
 * every Codex entry, so you can tell at a glance whether a catch would be new.
 */
export function OwnedMark({ owned, size = 15, testID }: { owned: boolean; size?: number; testID?: string }) {
  return owned ? (
    <NassaIcon size={size} filled testID={testID} />
  ) : (
    <NassaIcon size={size} filled={false} line="#9aa3aa" testID={testID} />
  );
}
