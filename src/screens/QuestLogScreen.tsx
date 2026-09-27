import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { questWorldOf, useGameStore } from "../state/gameStore";
import { QUESTS, questProgress, questState, type QuestState } from "../game/quests";
import { questGiver, questTitle, stepLabel } from "../game/questText";
import { itemsByCategory } from "../game/itemsRepo";
import { starterSignatureFor } from "../game/creatureFactory";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { MoveLearnModal, type MoveLearnPrompt } from "./components/MoveLearnModal";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";
import { useI18n } from "../i18n";
import { ui } from "../audio/sfx";

type Props = NativeStackScreenProps<RootStackParamList, "Quests">;

const STATE_COLOUR: Record<QuestState, string> = {
  unknown: colors.textMuted,
  locked: colors.textMuted,
  available: colors.accentDeep,
  active: "#2f6fb5",
  ready: colors.success,
  done: colors.success,
};

/**
 * Every side quest: who gives it and where, what is left to do, and what it pays. Quests you
 * haven't reached yet stay a mystery, so the log hints at the road ahead without spoiling it.
 * Also lists your key items, and — if a starter's signature move was skipped when the scroll
 * was handed over — lets you teach it here.
 */
export function QuestLogScreen({ navigation }: Props) {
  const i18n = useI18n();
  const { t, c } = i18n;
  const state = useGameStore();
  const world = questWorldOf(state);
  const [prompt, setPrompt] = useState<MoveLearnPrompt | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useKeyboardShortcuts({ m: () => navigation.popToTop() });

  const keyItems = itemsByCategory("key_items").filter((item) => (state.inventory[item.id] ?? 0) > 0);
  const starter = state.party.find((m) => m.sourceCategory === "starter" && starterSignatureFor(m.speciesId));
  const signature = starter ? starterSignatureFor(starter.speciesId)! : null;
  const canTeach = !!starter && !!signature && (state.inventory.signature_scroll ?? 0) > 0 && !starter.moveIds.includes(signature);

  function teach() {
    const result = state.teachSignature();
    if (result?.status === "learned" && starter && signature) {
      ui.confirm();
      setFeedback(t("quest.signatureLearned", { name: starter.displayName, move: c.move(signature) }));
    } else if (result?.status === "full") {
      setPrompt({ uid: result.member.uid, displayName: result.member.displayName, newMoveId: result.moveId, currentMoveIds: result.member.moveIds });
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>{t("quests.title")}</Text>
      <Text style={styles.subtitle}>{t("quests.subtitle")}</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {QUESTS.map((quest) => {
          const status = questState(quest, world);
          if (status === "unknown") {
            return (
              <View key={quest.id} testID={`quest-${quest.id}`} style={[styles.card, styles.cardUnknown]}>
                <Text style={styles.questTitle}>???</Text>
                <Text style={styles.muted}>{t("quests.unknown")}</Text>
              </View>
            );
          }
          const giver = questGiver(quest, i18n);
          const label =
            status === "locked"
              ? t("quests.state.locked", { medal: c.medal(quest.requiresMedal!) })
              : status === "ready"
                ? t("quests.state.ready", { giver })
                : t(`quests.state.${status}`);
          const showSteps = status === "active" || status === "ready";
          return (
            <View key={quest.id} testID={`quest-${quest.id}`} style={[styles.card, status === "done" && styles.cardDone]}>
              <View style={styles.cardHeader}>
                <Text style={styles.questTitle}>{questTitle(quest, i18n)}</Text>
                <Text testID={`quest-state-${quest.id}`} style={[styles.state, { color: STATE_COLOUR[status] }]}>
                  {label}
                </Text>
              </View>
              <Text style={styles.muted}>{t("quests.giverAt", { giver, zone: c.stage(quest.giver.zoneId) })}</Text>
              {showSteps &&
                questProgress(quest, world).map((p, i) => (
                  <Text key={i} style={[styles.step, p.done && styles.stepDone]}>
                    {p.done ? "✓ " : "○ "}
                    {stepLabel(p, i18n)}
                  </Text>
                ))}
              <Text style={styles.reward}>
                {t("quests.reward", { item: c.item(quest.reward.keyItemId), gold: quest.reward.gold })}
              </Text>
            </View>
          );
        })}

        <Text style={styles.section}>{t("quests.keyItems")}</Text>
        {keyItems.length === 0 && <Text style={styles.muted}>{t("quests.noKeyItems")}</Text>}
        {keyItems.map((item) => (
          <View key={item.id} testID={`key-item-${item.id}`} style={styles.card}>
            <Text style={styles.questTitle}>{c.item(item.id)}</Text>
            <Text style={styles.muted}>{c.itemDescription(item.id)}</Text>
            {item.id === "signature_scroll" && starter && signature && (
              canTeach ? (
                <Pressable
                  testID="teach-signature"
                  onPress={teach}
                  style={({ pressed }) => [styles.teach, pressed && styles.teachPressed]}
                >
                  <Text style={styles.teachText}>{t("quests.teach", { move: c.move(signature) })}</Text>
                </Pressable>
              ) : starter.moveIds.includes(signature) ? (
                <Text style={styles.reward}>{t("quests.knows", { name: starter.displayName, move: c.move(signature) })}</Text>
              ) : null
            )}
          </View>
        ))}
      </ScrollView>

      {feedback && <Text style={styles.feedback}>{feedback}</Text>}
      <PrimaryButton testID="back-button" label={t("common.back")} variant="secondary" onPress={() => navigation.goBack()} />
      {prompt && (
        <MoveLearnModal
          prompt={prompt}
          onReplace={(forget) => {
            state.replacePartyMemberMove(prompt.uid, forget, prompt.newMoveId);
            setFeedback(t("quest.signatureLearned", { name: prompt.displayName, move: c.move(prompt.newMoveId) }));
            setPrompt(null);
          }}
          onSkip={() => setPrompt(null)}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  list: {
    gap: 12,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 5,
  },
  cardUnknown: {
    backgroundColor: colors.surfaceAlt,
    borderStyle: "dashed",
  },
  cardDone: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  questTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  state: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  step: {
    color: colors.text,
    fontSize: 14,
  },
  stepDone: {
    color: colors.success,
  },
  reward: {
    color: colors.accentDeep,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  teach: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  teachPressed: {
    opacity: 0.8,
  },
  teachText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  feedback: {
    color: colors.text,
    fontSize: 13,
    textAlign: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
  },
});
