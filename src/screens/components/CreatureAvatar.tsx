import { StyleSheet, View } from "react-native";
import { typeColor } from "../theme";
import type { TypeName } from "../../data/schemas";
import { CreatureArt } from "../../art/creatureArt";
import { designFor } from "../../art/creatureDesigns";
import { HARSI_SVG } from "../../art/harsi/sprites.generated";
import { HandDrawn } from "../../art/handDrawn";

interface Props {
  speciesId: string;
  types: TypeName[];
  size?: number;
  faded?: boolean;
  /** Turn to face right: your own Ħarsi in battle, facing the enemy. Art is drawn facing left. */
  mirrored?: boolean;
}

/**
 * A Ħarsi's sprite. Each species is hand-drawn as an SVG (src/art/harsi/svg); a species without
 * one yet falls back to the composed design (src/art/creatureDesigns.ts). Both are vector art,
 * so a sprite is sharp at any size.
 *
 * `faded` is the Codex's "seen but not caught" state — the same sprite, dimmed.
 */
export function CreatureAvatar({ speciesId, types, size = 84, faded, mirrored }: Props) {
  const xml = HARSI_SVG[speciesId];
  return (
    <View style={[styles.wrap, { width: size, height: size }, faded ? styles.faded : null, mirrored ? styles.mirrored : null]}>
      {xml ? <HandDrawn xml={xml} size={size} /> : <CreatureArt design={designFor(speciesId, types, typeColor)} size={size} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  faded: {
    opacity: 0.35,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
