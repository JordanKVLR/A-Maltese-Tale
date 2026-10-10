import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { CHARACTERS, type CharacterId, type Line, type PortraitLook } from "../../game/story";
import { PEOPLE_SVG } from "../../art/people/sprites.generated";
import { HandDrawn } from "../../art/handDrawn";
import { useI18n } from "../../i18n";
import { MADUM, MadumFloor } from "../../art/madum";
import { ui } from "../../audio/sfx";
import { colors, malta } from "../theme";

/** A head-and-shoulders drawing of a story character: hand-drawn, or composed from their look. */
export function Portrait({ look, size = 72, who }: { look: PortraitLook; size?: number; who?: CharacterId }) {
  const drawn = who ? PEOPLE_SVG[`portrait-${who}`] : undefined;
  if (drawn) return <HandDrawn xml={drawn} size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={48} fill="#f4ecd8" stroke={look.accent} strokeWidth={3} />
      <G>
        {/* Shoulders */}
        <Path d="M16 100 Q18 72 50 70 Q82 72 84 100 Z" fill={look.top} />
        <Path d="M40 71 L50 84 L60 71" stroke={look.accent} strokeWidth={3} fill="none" />
        {/* Neck and head */}
        <Rect x={43} y={56} width={14} height={16} rx={5} fill={look.skin} />
        {look.hat === "hood" && <Path d="M24 62 Q22 18 50 16 Q78 18 76 62 Q70 44 50 42 Q30 44 24 62 Z" fill={look.top} />}
        {look.hat === "veil" && <Path d="M22 80 Q18 20 50 16 Q82 20 78 80 Q66 40 50 40 Q34 40 22 80 Z" fill={look.top} opacity={0.9} />}
        <Ellipse cx={50} cy={42} rx={17} ry={20} fill={look.skin} />
        {/* Hair */}
        {look.hat !== "hood" && look.hat !== "veil" && (
          <Path d="M33 40 Q32 20 50 20 Q68 20 67 40 Q62 28 50 28 Q38 28 33 40 Z" fill={look.hair} />
        )}
        {look.beard && <Path d="M35 46 Q36 64 50 64 Q64 64 65 46 Q60 56 50 56 Q40 56 35 46 Z" fill={look.hair} />}
        {/* Face */}
        <Circle cx={43} cy={42} r={2.4} fill="#2b3a44" />
        <Circle cx={57} cy={42} r={2.4} fill="#2b3a44" />
        <Path d="M45 51 Q50 54 55 51" stroke="#8a5a3a" strokeWidth={2} fill="none" strokeLinecap="round" />
        {look.glasses && (
          <G stroke="#3a2a1a" strokeWidth={1.6} fill="none">
            <Circle cx={43} cy={42} r={5.5} />
            <Circle cx={57} cy={42} r={5.5} />
            <Path d="M48.5 42 H51.5" />
          </G>
        )}
        {/* Headwear */}
        {look.hat === "cap" && <Path d="M32 32 Q34 18 50 18 Q66 18 68 32 L76 34 Q60 30 32 32 Z" fill={look.accent} />}
        {look.hat === "beret" && <Ellipse cx={48} cy={24} rx={20} ry={7} fill={look.accent} />}
        {look.hat === "tricorn" && <Path d="M24 30 Q50 8 76 30 Q62 24 50 26 Q38 24 24 30 Z" fill="#1d1d26" stroke={look.accent} strokeWidth={2} />}
      </G>
    </Svg>
  );
}

/**
 * A conversation: one line at a time, the speaker's portrait and name above it, tap anywhere to
 * go on. Narration has no portrait. The panel is a limestone card edged in madum tiles.
 */
export function DialogueModal({ lines, onDone, kicker }: { lines: Line[]; onDone: () => void; kicker?: string }) {
  const { lang } = useI18n();
  const [index, setIndex] = useState(0);
  const appear = useRef(new Animated.Value(0)).current;
  const line = lines[Math.min(index, lines.length - 1)];
  const speaker = CHARACTERS[line.who];
  const narration = line.who === "narrator";

  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  }, [index, appear]);

  function advance() {
    ui.tap();
    if (index + 1 >= lines.length) onDone();
    else setIndex(index + 1);
  }

  const text = lang === "mt" ? line.mt : line.en;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable testID="dialogue" style={styles.backdrop} onPress={advance}>
        <Animated.View
          style={[
            styles.panel,
            narration && styles.panelNarration,
            { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
          ]}
        >
          <View style={styles.band}>
            <MadumFloor pattern="star" palette={narration ? MADUM.slate : MADUM.blue} tile={14} />
          </View>
          {kicker && index === 0 ? <Text style={styles.kicker}>{kicker}</Text> : null}
          {!narration && (
            <View style={styles.speakerRow}>
              <Portrait look={speaker.look} who={line.who} size={64} />
              <View style={styles.speakerText}>
                <Text accessibilityRole="header" style={styles.name}>
                  {lang === "mt" ? speaker.name.mt : speaker.name.en}
                </Text>
                <Text style={styles.role}>{lang === "mt" ? speaker.role.mt : speaker.role.en}</Text>
              </View>
            </View>
          )}
          <Text testID="dialogue-text" style={[styles.text, narration && styles.textNarration]}>
            {text}
          </Text>
          <Text style={styles.progress}>
            {index + 1} / {lines.length} ›
          </Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18,32,42,0.55)",
    justifyContent: "flex-end",
    padding: 14,
    paddingBottom: 28,
  },
  panel: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    paddingTop: 24,
    gap: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: malta.blue,
    borderBottomWidth: 5,
  },
  panelNarration: {
    backgroundColor: "#f7f0e2",
    borderColor: "#8a7a5a",
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 10,
    overflow: "hidden",
  },
  kicker: {
    color: colors.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  speakerText: {
    flex: 1,
  },
  name: {
    color: malta.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  role: {
    color: colors.textMuted,
    fontSize: 12,
  },
  text: {
    color: malta.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  textNarration: {
    fontStyle: "italic",
    color: "#4a4030",
  },
  progress: {
    alignSelf: "flex-end",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
});
