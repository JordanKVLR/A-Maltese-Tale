import { createElement, useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useMusic } from "../audio/useMusic";
import { useSettings } from "../state/settingsStore";
import { volumeLevel } from "../game/settings";

type Props = NativeStackScreenProps<RootStackParamList, "Intro">;

/**
 * The opening music video, played before a new game. It is its own page (public/intro), shown
 * full screen in a frame; it says when it is finished or skipped, and the new game carries on.
 * Off the web there is no page to show, so it goes straight on.
 */
export function IntroScreen({ navigation }: Props) {
  // The game's own music stops while the song plays.
  useMusic(null);
  const musicVolume = useSettings((s) => s.musicVolume);

  useEffect(() => {
    const next = () => navigation.replace("NameEntry");
    if (Platform.OS !== "web" || typeof window === "undefined") {
      next();
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "maltese-intro-done") next();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigation]);

  if (Platform.OS !== "web") return <View style={styles.fill} />;
  const src = `intro/index.html?embed=1&autoplay=1&vol=${volumeLevel(musicVolume)}`;
  return (
    <View style={styles.fill} testID="intro-screen">
      {createElement("iframe", {
        src,
        title: "Ħarsi: Spirits of Malta, the opening",
        allow: "autoplay; fullscreen",
        style: { border: 0, width: "100%", height: "100%", display: "block", background: "#0b1a2e" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: "#0b1a2e",
  },
});
