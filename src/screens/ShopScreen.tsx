import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { purchasableItems } from "../game/itemsRepo";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { HoverTip } from "./components/HoverTip";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";
import { useI18n } from "../i18n";
import { ui } from "../audio/sfx";
import { tutorMovesFor } from "../game/tutor";
import { getMove } from "../game/movesRepo";
import { TypeBadge } from "./components/TypeBadge";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { MoveLearnModal, type MoveLearnPrompt } from "./components/MoveLearnModal";
import { MoveLearnedModal, type MoveLearnedNotice } from "./components/MoveLearnedModal";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;

const items = purchasableItems();

export function ShopScreen({ navigation }: Props) {
  const currency = useGameStore((s) => s.currency);
  const inventory = useGameStore((s) => s.inventory);
  const spendCurrency = useGameStore((s) => s.spendCurrency);
  const addItem = useGameStore((s) => s.addItem);
  const { t, c } = useI18n();
  const party = useGameStore((s) => s.party);
  const learnMove = useGameStore((s) => s.learnMove);
  const replacePartyMemberMove = useGameStore((s) => s.replacePartyMemberMove);
  const [tab, setTab] = useState<"goods" | "tutor">("goods");
  const [pupilUid, setPupilUid] = useState<string | null>(party[0]?.uid ?? null);
  const [prompt, setPrompt] = useState<(MoveLearnPrompt & { price: number }) | null>(null);
  const [learned, setLearned] = useState<MoveLearnedNotice | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const pupil = party.find((m) => m.uid === pupilUid) ?? party[0];

  function teach(moveId: string, price: number) {
    if (!pupil) return;
    if (currency < price) {
      ui.blocked();
      setFeedback(t("tutor.cantAfford"));
      return;
    }
    setFeedback(null);
    if (pupil.moveIds.length < 4) {
      if (!spendCurrency(price)) return;
      learnMove(pupil.uid, moveId);
      ui.coin();
      setLearned({ displayName: pupil.displayName, moveId });
      return;
    }
    setPrompt({ uid: pupil.uid, displayName: pupil.displayName, newMoveId: moveId, currentMoveIds: pupil.moveIds, price });
  }

  useKeyboardShortcuts({ m: () => navigation.popToTop() });

  function buy(itemId: string, price: number) {
    if (!spendCurrency(price)) return;
    addItem(itemId, 1);
    ui.coin();
  }

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("shop.title")}</Text>
        <Text style={styles.currency}>{t("common.gold", { amount: currency })}</Text>
      </View>
      <Text style={styles.subtitle}>{t("shop.subtitle")}</Text>

      <View style={styles.tabs}>
        {(["goods", "tutor"] as const).map((key) => (
          <Pressable
            key={key}
            testID={`shop-tab-${key}`}
            onPress={() => {
              ui.tap();
              setTab(key);
              setFeedback(null);
            }}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{key === "goods" ? t("shop.goods") : t("tutor.title")}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "tutor" ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.subtitle}>{t("tutor.subtitle")}</Text>
          <Text style={styles.itemName}>{t("tutor.pick")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pupils}>
            {party.map((member) => (
              <Pressable
                key={member.uid}
                testID={`tutor-pupil-${member.uid}`}
                onPress={() => {
                  ui.tap();
                  setPupilUid(member.uid);
                  setFeedback(null);
                }}
                style={[styles.pupil, pupil?.uid === member.uid && styles.pupilActive]}
              >
                <CreatureAvatar speciesId={member.speciesId} types={member.types} size={40} />
                <Text style={styles.pupilName} numberOfLines={1}>
                  {member.displayName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {pupil && tutorMovesFor(pupil).length === 0 && <Text style={styles.itemDescription}>{t("tutor.none", { name: pupil.displayName })}</Text>}
          {pupil &&
            tutorMovesFor(pupil).map(({ moveId, level, price }) => {
              const move = getMove(moveId);
              const canAfford = currency >= price;
              return (
                <View key={moveId} style={styles.card} testID={`tutor-move-${moveId}`}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{c.move(moveId)}</Text>
                    <TypeBadge type={move.type} />
                  </View>
                  <Text style={styles.itemDescription}>
                    {move.category === "status"
                      ? t("battle.moveStatus", { accuracy: move.accuracy })
                      : t("battle.movePower", { power: move.power, accuracy: move.accuracy })}
                    {"  ·  "}
                    {t("tutor.learnedAt", { level })}
                  </Text>
                  <View style={styles.buyRow}>
                    <Text style={styles.price}>{t("common.gold", { amount: price })}</Text>
                    <Pressable
                      testID={`tutor-teach-${moveId}`}
                      disabled={!canAfford}
                      onPress={() => teach(moveId, price)}
                      style={({ pressed }) => [styles.buyButton, !canAfford && styles.buyButtonDisabled, pressed && canAfford && styles.buyButtonPressed]}
                    >
                      <Text style={styles.buyButtonText}>{t("tutor.teach")}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => {
          const owned = inventory[item.id] ?? 0;
          const canAfford = currency >= (item.price ?? 0);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{c.item(item.id)}</Text>
                <Text style={styles.itemQty}>{t("shop.owned", { count: owned })}</Text>
              </View>
              <Text style={styles.itemDescription}>{c.itemDescription(item.id)}</Text>
              <View style={styles.buyRow}>
                <Text style={styles.price}>{t("common.gold", { amount: item.price ?? 0 })}</Text>
                <HoverTip text={c.itemDescription(item.id)}>
                  <Pressable
                    testID={`buy-${item.id}`}
                    disabled={!canAfford}
                    onPress={() => buy(item.id, item.price ?? 0)}
                    style={({ pressed }) => [
                      styles.buyButton,
                      !canAfford && styles.buyButtonDisabled,
                      pressed && canAfford && styles.buyButtonPressed,
                    ]}
                  >
                    <Text style={styles.buyButtonText}>{t("shop.buy")}</Text>
                  </Pressable>
                </HoverTip>
              </View>
            </View>
          );
        })}
      </ScrollView>
      )}

      {feedback && <Text style={styles.feedback}>{feedback}</Text>}
      <PrimaryButton testID="back-button" label={t("common.back")} variant="secondary" onPress={() => navigation.goBack()} />
      {prompt && (
        <MoveLearnModal
          prompt={prompt}
          onReplace={(forgetMoveId) => {
            if (spendCurrency(prompt.price)) {
              replacePartyMemberMove(prompt.uid, forgetMoveId, prompt.newMoveId);
              ui.coin();
              setLearned({ displayName: prompt.displayName, moveId: prompt.newMoveId });
            }
            setPrompt(null);
          }}
          onSkip={() => setPrompt(null)}
        />
      )}
      {learned && <MoveLearnedModal notice={learned} onDismiss={() => setLearned(null)} />}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  currency: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
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
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemQty: {
    color: colors.textMuted,
    fontSize: 12,
  },
  itemDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  buyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  buyButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buyButtonDisabled: {
    opacity: 0.35,
  },
  buyButtonPressed: {
    opacity: 0.75,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#d6c6a6",
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: "#1f4e8c",
    borderColor: "#163a6a",
  },
  tabText: {
    color: "#1f4e8c",
    fontWeight: "800",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  pupils: {
    gap: 8,
    paddingVertical: 4,
  },
  pupil: {
    width: 86,
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pupilActive: {
    borderColor: colors.accent,
    backgroundColor: "#fff6e2",
  },
  pupilName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  feedback: {
    color: colors.text,
    fontSize: 13,
    textAlign: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  buyButtonText: {
    color: "#0d1b2a",
    fontWeight: "700",
    fontSize: 13,
  },
});
