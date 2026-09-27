import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { MadumFloor, MenuIcon, type MadumPalette, type MadumPatternName, type MenuIconName } from "../../art/madum";
import { colors, malta } from "../theme";
import { ui } from "../../audio/sfx";

/**
 * A menu button made of madum: a patterned tile with a cream medallion holding the icon, and
 * the label underneath. Pressing it sinks the card, turns the medallion a quarter-turn like
 * a tile being set into place, and clicks.
 */
export function MenuTile({
  label,
  sub,
  icon,
  pattern,
  palette,
  onPress,
  testID,
  badge,
}: {
  label: string;
  sub?: string;
  icon: MenuIconName;
  pattern: MadumPatternName;
  palette: MadumPalette;
  onPress: () => void;
  testID?: string;
  /** A small count or alert in the corner, e.g. quests ready to hand in. */
  badge?: string | null;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const animate = (down: boolean) => {
    Animated.spring(press, { toValue: down ? 1 : 0, useNativeDriver: false, friction: 5, tension: 240 }).start();
    if (down) {
      spin.setValue(0);
      Animated.timing(spin, { toValue: 1, duration: 320, useNativeDriver: false }).start();
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
            { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
          ],
        },
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => animate(true)}
        onPressOut={() => animate(false)}
        onPress={() => {
          ui.tap();
          onPress();
        }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.card,
          hovered && styles.cardHover,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.art}>
          <MadumFloor pattern={pattern} palette={palette} tile={44} />
          <Animated.View
            style={[
              styles.medallion,
              { borderColor: palette.primary },
              { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) }] },
            ]}
          >
            <Animated.View
              style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-90deg"] }) }] }}
            >
              <MenuIcon name={icon} size={30} color={palette.primary} />
            </Animated.View>
          </Animated.View>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.caption}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {sub ? (
            <Text style={styles.sub} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    flexBasis: "40%",
    minWidth: 140,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "#d9c9a8",
    borderBottomWidth: 4,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHover: {
    borderColor: malta.blue,
  },
  cardPressed: {
    borderBottomWidth: 2,
    marginTop: 2,
  },
  art: {
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  medallion: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: malta.cream,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: malta.red,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  caption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: "#eadfc8",
  },
  label: {
    color: malta.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
