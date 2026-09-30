import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { questWorldOf, useGameStore } from "../state/gameStore";
import { ALL_MEDALS, STAGES } from "../game/zoneProgression";
import { CHAPTERS, CHARACTERS, currentChapter, nextObjective } from "../game/story";
import { partyMemberStats } from "../game/party";
import { HpBar } from "./components/HpBar";
import { TypeBadge } from "./components/TypeBadge";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { ScreenBackground } from "./components/ScreenBackground";
import { MenuTile } from "./components/MenuTile";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors, malta } from "./theme";
import { completionProgress } from "../game/trainers";
import { festaOn } from "../game/festa";
import { COLLECTOR_MEDALS, TOTAL_SPECIES, ownedCount } from "../game/collection";
import { QUESTS, questState } from "../game/quests";
import { Bunting, MADUM, MadumFloor, MenuIcon } from "../art/madum";
import { ui } from "../audio/sfx";
import { useI18n } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

/**
 * The main menu, dressed as a Maltese town house: a balcony-blue card for your lead creature,
 * festa bunting for today's feast, the way back out as a big honey-coloured door, and every
 * other screen laid out as a floor of madum tiles. It scrolls, so nothing is ever pushed off
 * the bottom of a small phone.
 */
export function HomeScreen({ navigation }: Props) {
  const state = useGameStore();
  const { party, battlesWon, medals, defeatedTrainerIds, currency, currentZoneId } = state;
  const progress = completionProgress(defeatedTrainerIds);
  const festa = festaOn();
  const owned = ownedCount(state.caughtSpeciesIds);
  const world = questWorldOf(state);
  const questsReady = QUESTS.filter((q) => questState(q, world) === "ready").length;
  const questsNew = QUESTS.filter((q) => questState(q, world) === "available").length;
  const { width } = useWindowDimensions();
  const [bannerWidth, setBannerWidth] = useState(Math.min(width, 640) - 40);

  const leadMember = party[0];
  const i18n = useI18n();
  const { t, c } = i18n;
  const storyWorld = { storyFlags: state.storyFlags, medals, defeatedTrainerIds };
  const chapter = CHAPTERS.find((ch) => ch.number === currentChapter(storyWorld));
  const objective = nextObjective(
    storyWorld,
    STAGES.filter((s) => s.gym).map((s) => ({ zoneId: s.id, medalId: s.gym!.medalId }))
  );
  const zoneName = c.stage(currentZoneId);

  useKeyboardShortcuts({
    b: () => navigation.navigate("Bag"),
    p: () => navigation.navigate("Party"),
    m: () => navigation.popToTop(),
  });

  const tiles = [
    { key: "party", label: t("home.party"), sub: t("home.sub.party", { count: party.length }), icon: "party", pattern: "star", palette: MADUM.blue, go: () => navigation.navigate("Party") },
    { key: "bag", label: t("home.bag"), sub: t("home.sub.bag"), icon: "bag", pattern: "quatrefoil", palette: MADUM.terracotta, go: () => navigation.navigate("Bag") },
    { key: "codex", label: t("home.codex"), sub: t("home.sub.codex", { owned, total: TOTAL_SPECIES }), icon: "codex", pattern: "rosette", palette: MADUM.green, go: () => navigation.navigate("Codex") },
    {
      key: "quests",
      label: t("home.quests"),
      sub: questsReady > 0 ? t("home.sub.questsReady", { count: questsReady }) : t("home.sub.quests"),
      icon: "quests",
      pattern: "lozenge",
      palette: MADUM.ochre,
      badge: questsReady > 0 ? String(questsReady) : questsNew > 0 ? "!" : null,
      go: () => navigation.navigate("Quests"),
    },
    { key: "shop", label: t("home.shop"), sub: t("home.sub.shop"), icon: "shop", pattern: "quatrefoil", palette: MADUM.green, go: () => navigation.navigate("Shop") },
    { key: "help", label: t("home.help"), sub: t("home.sub.help"), icon: "help", pattern: "star", palette: MADUM.terracotta, go: () => navigation.navigate("Help") },
    { key: "settings", label: t("home.settings"), sub: t("home.sub.settings"), icon: "settings", pattern: "lozenge", palette: MADUM.slate, go: () => navigation.navigate("Settings") },
    { key: "music", label: t("home.music"), sub: t("home.sub.music"), icon: "music", pattern: "rosette", palette: MADUM.blue, go: () => navigation.navigate("MusicRoom") },
  ] as const;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          {/* Where you are, and what you've got. */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.kicker}>{t("home.youAreIn")}</Text>
              <Text accessibilityRole="header" style={styles.zone} numberOfLines={1}>
                {zoneName}
              </Text>
            </View>
            <View style={styles.goldPill} testID="home-gold">
              <View style={styles.coin} />
              <Text style={styles.goldText}>{currency.toLocaleString()}</Text>
            </View>
          </View>

          {/* The lead creature, on a balcony-blue card edged with tiles. */}
          {leadMember && (
            <Pressable
              testID="home-lead"
              onPress={() => {
                ui.tap();
                navigation.navigate("CreatureDetail", { source: "party", uid: leadMember.uid });
              }}
              style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
            >
              <View style={styles.heroBand}>
                <MadumFloor pattern="star" palette={MADUM.blue} tile={18} />
              </View>
              <View style={styles.heroBody}>
                <View style={styles.avatarWell}>
                  <CreatureAvatar speciesId={leadMember.speciesId} types={leadMember.types} size={76} />
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroKicker}>{t("home.lead")}</Text>
                  <Text accessibilityRole="header" style={styles.heroName} numberOfLines={1}>
                    {leadMember.displayName} <Text style={styles.heroLevel}>{t("common.level", { level: leadMember.level })}</Text>
                  </Text>
                  <View style={styles.badgeRow}>
                    {leadMember.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </View>
                  <HpBar currentHp={leadMember.currentHp} maxHp={partyMemberStats(leadMember).hp} onDark />
                </View>
              </View>
              <View style={styles.statStrip}>
                <Stat value={String(battlesWon)} label={t("home.stat.battles")} />
                <View style={styles.statDivider} />
                <Stat
                  value={`${progress.trainersDefeated}/${progress.trainersTotal}`}
                  label={t("home.stat.trainers")}
                  testID="completion-progress"
                />
                <View style={styles.statDivider} />
                <Stat value={`${owned}/${TOTAL_SPECIES}`} label={t("home.stat.creatures")} testID="collector-progress" />
              </View>
            </Pressable>
          )}
          {progress.complete && <Text style={styles.complete}>{t("home.complete")}</Text>}

          {/* Where the story stands: the chapter, and what it wants next. */}
          <View style={styles.storyCard} testID="home-story">
            <View style={styles.storyBand}>
              <MadumFloor pattern="lozenge" palette={MADUM.terracotta} tile={16} />
            </View>
            <Text style={styles.storyKicker}>{t("story.card")}</Text>
            <Text accessibilityRole="header" style={styles.storyChapter}>
              {chapter ? (i18n.lang === "mt" ? chapter.title.mt : chapter.title.en) : ""}
            </Text>
            <Text style={styles.storyNext}>
              {objective.kind === "battle"
                ? t("story.nextBattle", {
                    name: i18n.lang === "mt" ? CHARACTERS[objective.battle.who].name.mt : CHARACTERS[objective.battle.who].name.en,
                    zone: c.stage(objective.battle.zoneId),
                  })
                : objective.kind === "gym"
                  ? t("story.nextGym", { medal: c.medal(objective.medalId), zone: c.stage(objective.zoneId) })
                  : t("story.done")}
            </Text>
          </View>

          {/* Today's festa, under a string of bunting. */}
          <View style={styles.festa} onLayout={(e) => setBannerWidth(e.nativeEvent.layout.width)}>
            <Bunting width={bannerWidth} />
            <Text style={styles.festaText} testID="festa-today">
              {t("festa.today", { feast: t(`festa.name.${festa.feastId}`), zone: c.stage(festa.zoneId) })}
            </Text>
          </View>

          <ExploreDoor label={t("home.explore", { zone: zoneName })} sub={t("home.sub.explore")} onPress={() => navigation.popToTop()} />

          {/* Every other screen, as a floor of tiles. */}
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <MenuTile
                key={tile.key}
                testID={`nav-${tile.key}`}
                label={tile.label}
                sub={tile.sub}
                icon={tile.icon}
                pattern={tile.pattern}
                palette={tile.palette}
                badge={"badge" in tile ? tile.badge : null}
                onPress={tile.go}
              />
            ))}
          </View>

          {/* Medals: the four gyms, then the collector's set. */}
          <View style={styles.medalCard}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{t("home.medals")}</Text>
            <View style={styles.medalRow}>
              {ALL_MEDALS.map((medal) => {
                const earned = medals.includes(medal.medalId);
                return (
                  <Medal
                    key={medal.medalId}
                    testID={`medal-${medal.medalId}${earned ? "-earned" : ""}`}
                    earned={earned}
                    glyph="★"
                    label={c.medal(medal.medalId).replace(" Medal", "").replace("Midalja ", "")}
                  />
                );
              })}
            </View>
            <Text style={styles.sectionSub}>{t("collector.title")}</Text>
            <View style={styles.medalRow}>
              {COLLECTOR_MEDALS.map((medal) => {
                const earned = owned >= medal.count;
                return (
                  <Medal
                    key={medal.id}
                    testID={`medal-${medal.id}${earned ? "-earned" : ""}`}
                    earned={earned}
                    small
                    glyph={medal.count === TOTAL_SPECIES ? t("collector.shortAll") : String(medal.count)}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.footerBand}>
            <MadumFloor pattern="lozenge" palette={MADUM.terracotta} tile={24} />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Stat({ value, label, testID }: { value: string; label: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Medal({ earned, glyph, label, small, testID }: { earned: boolean; glyph: string; label?: string; small?: boolean; testID?: string }) {
  return (
    <View style={styles.medal} testID={testID}>
      <View style={[styles.medalCoin, small && styles.medalCoinSmall, earned ? styles.medalCoinEarned : styles.medalCoinEmpty]}>
        <Text style={[styles.medalGlyph, small && styles.medalGlyphSmall, earned && styles.medalGlyphEarned]}>{glyph}</Text>
      </View>
      {label ? (
        <Text style={[styles.medalLabel, earned && styles.medalLabelEarned]} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** The way back out: a big honey-coloured door with the luzzu's eye on it, gently breathing. */
function ExploreDoor({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  const press = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  const spring = (down: boolean) =>
    Animated.spring(press, { toValue: down ? 1 : 0, useNativeDriver: false, friction: 5, tension: 240 }).start();
  return (
    <Animated.View
      style={{
        transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }],
        shadowColor: colors.accent,
        shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }) as unknown as number,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        borderRadius: 18,
      }}
    >
      <Pressable
        testID="nav-explore"
        onPressIn={() => spring(true)}
        onPressOut={() => spring(false)}
        onPress={() => {
          ui.confirm();
          onPress();
        }}
        style={({ pressed }) => [styles.door, pressed && styles.doorPressed]}
      >
        <View style={styles.doorArt}>
          <MadumFloor pattern="rosette" palette={MADUM.ochre} tile={30} opacity={0.14} />
        </View>
        <View style={styles.doorEye}>
          <MenuIcon name="explore" size={34} color={malta.blueDeep} />
        </View>
        <View style={styles.doorText}>
          <Text accessibilityRole="header" style={styles.doorLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.doorSub} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Text style={styles.doorArrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 640,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  zone: {
    color: malta.ink,
    fontSize: 24,
    fontWeight: "900",
    maxWidth: 260,
  },
  goldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff6df",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#e7c77a",
  },
  coin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f3c14a",
    borderWidth: 2,
    borderColor: "#b98a16",
  },
  goldText: {
    color: "#8a5a08",
    fontSize: 15,
    fontWeight: "900",
  },
  hero: {
    backgroundColor: malta.blue,
    borderRadius: 20,
    overflow: "hidden",
    borderBottomWidth: 5,
    borderColor: malta.blueDeep,
  },
  heroPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  heroBand: {
    height: 18,
    overflow: "hidden",
  },
  heroBody: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    alignItems: "center",
  },
  avatarWell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: malta.cream,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#e0a53a",
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroKicker: {
    color: "#bcd3ec",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  heroLevel: {
    color: "#cfe0f3",
    fontSize: 14,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  statStrip: {
    flexDirection: "row",
    backgroundColor: malta.blueDeep,
    paddingVertical: 10,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  statLabel: {
    color: "#a9c2de",
    fontSize: 11,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  complete: {
    color: malta.green,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  storyCard: {
    backgroundColor: "#fdf6ea",
    borderRadius: 16,
    padding: 14,
    paddingTop: 20,
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#e8c9a8",
    overflow: "hidden",
  },
  storyBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 8,
    overflow: "hidden",
  },
  storyKicker: {
    color: "#b9472f",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  storyChapter: {
    color: malta.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  storyNext: {
    color: colors.textMuted,
    fontSize: 13,
  },
  festa: {
    backgroundColor: "#fff1f3",
    borderRadius: 14,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "#f1c7cf",
    overflow: "hidden",
    gap: 4,
  },
  festaText: {
    color: "#a2203b",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  door: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
    borderBottomWidth: 5,
    borderColor: colors.accentDeep,
  },
  doorPressed: {
    borderBottomWidth: 2,
    marginTop: 3,
  },
  doorArt: {
    ...StyleSheet.absoluteFillObject,
  },
  doorEye: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: malta.cream,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: malta.blueDeep,
  },
  doorText: {
    flex: 1,
  },
  doorLabel: {
    color: "#2a1a05",
    fontSize: 18,
    fontWeight: "900",
  },
  doorSub: {
    color: "#5e3c07",
    fontSize: 12,
    fontWeight: "700",
  },
  doorArrow: {
    color: "#2a1a05",
    fontSize: 34,
    fontWeight: "900",
    marginTop: -4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  medalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#e2d4b8",
  },
  sectionTitle: {
    color: malta.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  medalRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 6,
  },
  medal: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  medalCoin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  medalCoinSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  medalCoinEarned: {
    backgroundColor: "#f3c14a",
    borderColor: "#b98a16",
  },
  medalCoinEmpty: {
    backgroundColor: colors.surfaceAlt,
    borderColor: "#dccdb0",
    borderStyle: "dashed",
  },
  medalGlyph: {
    color: "#c8b893",
    fontSize: 20,
    fontWeight: "900",
  },
  medalGlyphSmall: {
    fontSize: 12,
  },
  medalGlyphEarned: {
    color: "#6b4a06",
  },
  medalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  medalLabelEarned: {
    color: "#8a5a08",
  },
  footerBand: {
    height: 24,
    borderRadius: 6,
    overflow: "hidden",
    opacity: 0.85,
  },
});
