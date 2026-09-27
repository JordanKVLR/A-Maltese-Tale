import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const COLOURS = ["#ff5a5a", "#ffd24a", "#6ad0ff", "#9dff7a", "#ff8af0"];
const SPARKS = 14;
/** Where the bursts go off, as fractions of the view — high up, clear of the controls. */
const SPOTS = [
  { x: 0.22, y: 0.14, delay: 0 },
  { x: 0.72, y: 0.1, delay: 900 },
  { x: 0.5, y: 0.24, delay: 1700 },
  { x: 0.85, y: 0.3, delay: 2500 },
];

function Burst({ x, y, delay, colour }: { x: number; y: number; delay: number; colour: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1300, useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.delay(3200 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  const opacity = t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.8, 0] });
  return (
    <View pointerEvents="none" style={[styles.burst, { left: `${x * 100}%`, top: `${y * 100}%` }]}>
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        const distance = t.interpolate({ inputRange: [0, 1], outputRange: [0, 38] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                backgroundColor: colour,
                opacity,
                transform: [
                  { translateX: Animated.multiply(distance, Math.cos(angle)) },
                  { translateY: Animated.add(Animated.multiply(distance, Math.sin(angle)), Animated.multiply(t, 14)) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Fireworks over the 2D map on a festa day. */
export function Fireworks2D() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="festa-fireworks">
      {SPOTS.map((spot, i) => (
        <Burst key={i} {...spot} colour={COLOURS[i % COLOURS.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  burst: {
    position: "absolute",
    width: 0,
    height: 0,
  },
  spark: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
