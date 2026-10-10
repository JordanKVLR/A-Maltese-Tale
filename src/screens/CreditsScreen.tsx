import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { CHARACTERS, type CharacterId } from "../game/story";
import { Portrait } from "./components/DialogueModal";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { MADUM, MadumFloor } from "../art/madum";
import { useMusic } from "../audio/useMusic";
import { colors, malta } from "./theme";
import { useI18n } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Credits">;

const CAST: CharacterId[] = ["abela", "luca", "carmela", "baron", "ganni", "pawl", "fra_anton", "kaptan", "dun_gorg", "brimlu", "sansuna", "xprunara"];

/** The real places and events the story is built on, in the order you meet them. */
const HISTORY: { en: string; mt: string }[] = [
  { en: "Għar Dalam — Malta's oldest human traces, c. 5900 BC", mt: "Għar Dalam — l-eqdem traċċi tal-bniedem f'Malta, c. 5900 QK" },
  { en: "Ġgantija, Ħaġar Qim, Mnajdra — temples from 3600 BC", mt: "Il-Ġgantija, Ħaġar Qim, l-Imnajdra — tempji mill-3600 QK" },
  { en: "Ħal Saflieni Hypogeum — the Sleeping Lady's resting place", mt: "L-Ipoġew ta' Ħal Saflieni — fejn instabet il-Mara Rieqda" },
  { en: "Tas-Silġ, Marsaxlokk — the Phoenicians' sanctuary to Astarte", mt: "Tas-Silġ, Marsaxlokk — is-santwarju Feniċju lil Astarte" },
  { en: "St Paul's shipwreck, AD 60 — Acts 27–28", mt: "In-nawfraġju ta' San Pawl, 60 WK — Atti 27–28" },
  { en: "Mdina — Roman Melite, walled by the Arabs", mt: "L-Imdina — Melite Rumana, issiġillata mill-Għarab" },
  { en: "The Great Siege, 1565 — relieved 8 September", mt: "L-Assedju l-Kbir, 1565 — meħlus fit-8 ta' Settembru" },
  { en: "St Mary's Tower, Comino — 1618", mt: "It-Torri ta' Santa Marija, Kemmuna — 1618" },
  { en: "The George Cross, April 1942 · the Santa Marija convoy, August 1942", mt: "Il-George Cross, April 1942 · il-konvoj ta' Santa Marija, Awwissu 1942" },
];

export function CreditsScreen({ navigation }: Props) {
  const { t, lang } = useI18n();
  useMusic("title");
  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.band}>
            <MadumFloor pattern="rosette" palette={MADUM.blue} tile={28} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {t("title.name")}
          </Text>
          <Text style={styles.subname}>{t("title.subname")}</Text>
          <Text style={styles.theEnd}>{t("credits.theEnd")}</Text>
          <Text style={styles.lede}>{t("credits.lede")}</Text>

          <Text accessibilityRole="header" style={styles.section}>
            {t("credits.cast")}
          </Text>
          <View style={styles.cast}>
            {CAST.map((id) => {
              const c = CHARACTERS[id];
              return (
                <View key={id} style={styles.castMember}>
                  <Portrait look={c.look} who={id} size={56} />
                  <Text style={styles.castName}>{lang === "mt" ? c.name.mt : c.name.en}</Text>
                  <Text style={styles.castRole}>{lang === "mt" ? c.role.mt : c.role.en}</Text>
                </View>
              );
            })}
          </View>

          <Text accessibilityRole="header" style={styles.section}>
            {t("credits.history")}
          </Text>
          {HISTORY.map((h) => (
            <Text key={h.en} style={styles.history}>
              ✦ {lang === "mt" ? h.mt : h.en}
            </Text>
          ))}

          <Text style={styles.thanks}>{t("credits.thanks")}</Text>
          <PrimaryButton testID="credits-continue" label={t("credits.continue")} onPress={() => navigation.popToTop()} />
          <View style={styles.band}>
            <MadumFloor pattern="lozenge" palette={MADUM.terracotta} tile={24} />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 560,
    gap: 14,
  },
  band: {
    height: 24,
    borderRadius: 6,
    overflow: "hidden",
  },
  title: {
    color: malta.blue,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  subname: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: -10,
  },
  theEnd: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  lede: {
    color: malta.ink,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  section: {
    color: malta.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
  },
  cast: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  castMember: {
    width: 150,
    alignItems: "center",
    gap: 2,
  },
  castName: {
    color: malta.ink,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  castRole: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
  history: {
    color: malta.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  thanks: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
});
