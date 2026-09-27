import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";
import { MADUM, MadumFloor } from "../../art/madum";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * The backdrop every menu shares: warm limestone, a whisper of madum tiles across it, and a
 * tiled border along the top edge like the skirting of an old Maltese floor.
 */
export function ScreenBackground({ children, style }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={["#f7f0e2", colors.background, "#efe4cd"]} style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MadumFloor pattern="quatrefoil" palette={MADUM.blue} tile={64} opacity={0.05} />
      </View>
      <View style={styles.band} pointerEvents="none">
        <MadumFloor pattern="star" palette={MADUM.blue} tile={14} />
      </View>
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 14,
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
});
