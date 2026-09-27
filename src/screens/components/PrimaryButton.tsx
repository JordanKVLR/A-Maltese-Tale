import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors, malta } from "../theme";
import { ui } from "../../audio/sfx";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  testID?: string;
}

/**
 * Every button in the game is a thing you press: it sinks into its thicker bottom edge,
 * springs back, and clicks. Without that, taps feel like nothing happened until the next
 * screen arrives.
 */
export function PrimaryButton({ label, onPress, disabled, variant = "primary", testID }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (down: boolean) =>
    Animated.spring(scale, { toValue: down ? 0.97 : 1, useNativeDriver: false, friction: 5, tension: 260 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          ui.tap();
          onPress();
        }}
        onPressIn={() => !disabled && press(true)}
        onPressOut={() => press(false)}
        disabled={disabled}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          variant === "secondary" ? styles.secondary : styles.primary,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.text, variant === "secondary" && styles.secondaryText]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDeep,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: "#d6c6a6",
  },
  pressed: {
    borderBottomWidth: 2,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: "#2a1a05",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: malta.blue,
  },
});
