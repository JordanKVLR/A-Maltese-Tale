import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { partyMemberStats, type PartyMember } from "../game/party";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { TypeBadge } from "./components/TypeBadge";
import { HpBar } from "./components/HpBar";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";
import { useI18n } from "../i18n";
import { ui } from "../audio/sfx";

type Props = NativeStackScreenProps<RootStackParamList, "Cage">;

const MAX_PARTY = 6;

/**
 * The Gaġġa: the island's answer to a storage box. Every creature you aren't travelling with
 * rests here, healed, and any Gaġġa reaches all of them — so you can reshape your party on
 * whichever stage you're on. Leave a creature, take one along, or swap one straight in.
 */
export function CageScreen({ navigation }: Props) {
  const { t } = useI18n();
  const party = useGameStore((s) => s.party);
  const cage = useGameStore((s) => s.cage);
  const depositCreature = useGameStore((s) => s.depositCreature);
  const withdrawCreature = useGameStore((s) => s.withdrawCreature);
  const swapWithCage = useGameStore((s) => s.swapWithCage);
  const releaseFromCage = useGameStore((s) => s.releaseFromCage);
  /** A Gaġġa creature the player has asked to release, waiting for the second tap. */
  const [releasing, setReleasing] = useState<string | null>(null);
  /** A Gaġġa creature waiting for the party member it will replace. */
  const [swapping, setSwapping] = useState<PartyMember | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useKeyboardShortcuts({ m: () => navigation.popToTop() });

  const partyFull = party.length >= MAX_PARTY;

  function deposit(member: PartyMember) {
    if (!depositCreature(member.uid)) {
      ui.blocked();
      setFeedback(t("cage.lastOne"));
      return;
    }
    ui.confirm();
    setFeedback(t("cage.deposited", { name: member.displayName }));
  }

  function take(member: PartyMember) {
    if (partyFull) {
      ui.tap();
      setSwapping(member);
      setFeedback(t("cage.swapPick", { name: member.displayName }));
      return;
    }
    withdrawCreature(member.uid);
    ui.confirm();
    setFeedback(t("cage.withdrawn", { name: member.displayName }));
  }

  function swapOut(leaving: PartyMember) {
    if (!swapping) return;
    swapWithCage(leaving.uid, swapping.uid);
    ui.confirm();
    setFeedback(t("cage.swapped", { joining: swapping.displayName, leaving: leaving.displayName }));
    setSwapping(null);
  }

  function release(member: PartyMember) {
    releaseFromCage(member.uid);
    ui.close();
    setReleasing(null);
    setFeedback(t("cage.released", { name: member.displayName }));
  }

  const row = (
    member: PartyMember,
    action: { label: string; testID: string; onPress: () => void; highlight?: boolean },
    canRelease = false
  ) => (
    <View key={member.uid} testID={`cage-row-${member.uid}`} style={[styles.cardWrap, action.highlight && styles.cardHighlight]}>
    <View style={styles.card}>
      <CreatureAvatar speciesId={member.speciesId} types={member.types} size={48} faded={member.currentHp <= 0} />
      <View style={styles.info}>
        <Text style={styles.name}>
          {member.displayName} <Text style={styles.level}>{t("common.level", { level: member.level })}</Text>
        </Text>
        <View style={styles.badges}>
          {member.types.map((type) => (
            <TypeBadge key={type} type={type} />
          ))}
        </View>
        <HpBar currentHp={member.currentHp} maxHp={partyMemberStats(member).hp} />
      </View>
      <Pressable
        testID={action.testID}
        onPress={action.onPress}
        style={({ pressed }) => [styles.action, action.highlight && styles.actionHighlight, pressed && styles.actionPressed]}
      >
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    </View>
    {canRelease &&
      (releasing === member.uid ? (
        <View style={styles.releaseRow}>
          <Text style={styles.releaseQuestion}>{t("cage.releaseConfirm", { name: member.displayName })}</Text>
          <Pressable testID={`cage-release-yes-${member.uid}`} onPress={() => release(member)} style={[styles.releaseButton, styles.releaseYes]}>
            <Text style={styles.releaseYesText}>{t("cage.releaseYes")}</Text>
          </Pressable>
          <Pressable testID={`cage-release-no-${member.uid}`} onPress={() => setReleasing(null)} style={styles.releaseButton}>
            <Text style={styles.releaseNoText}>{t("cage.cancel")}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={`cage-release-${member.uid}`}
          onPress={() => {
            ui.tap();
            setReleasing(member.uid);
          }}
          style={styles.releaseLink}
        >
          <Text style={styles.releaseLinkText}>{t("cage.release")}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>{t("cage.title")}</Text>
      <Text style={styles.subtitle}>{t("cage.subtitle")}</Text>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.section}>{t("cage.party", { count: party.length })}</Text>
        {party.map((member) =>
          swapping
            ? row(member, { label: t("cage.swap"), testID: `cage-swap-${member.uid}`, onPress: () => swapOut(member), highlight: true })
            : row(member, { label: t("cage.deposit"), testID: `cage-deposit-${member.uid}`, onPress: () => deposit(member) })
        )}

        <Text style={styles.section}>{t("cage.stored", { count: cage.length })}</Text>
        {cage.length === 0 && <Text style={styles.muted}>{t("cage.empty")}</Text>}
        {cage.map((member) =>
          row(member, {
            label: partyFull ? t("cage.swap") : t("cage.withdraw"),
            testID: `cage-take-${member.uid}`,
            onPress: () => take(member),
            highlight: swapping?.uid === member.uid,
          }, !swapping)
        )}
      </ScrollView>

      {feedback && (
        <Text testID="cage-feedback" style={styles.feedback}>
          {feedback}
        </Text>
      )}
      {swapping ? (
        <PrimaryButton
          testID="cage-cancel"
          label={t("cage.cancel")}
          variant="secondary"
          onPress={() => {
            setSwapping(null);
            setFeedback(null);
          }}
        />
      ) : (
        <PrimaryButton testID="back-button" label={t("common.back")} variant="secondary" onPress={() => navigation.goBack()} />
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
    gap: 10,
    paddingVertical: 4,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  cardWrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  releaseLink: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  releaseLinkText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  releaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  releaseQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  releaseButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  releaseYes: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  releaseYesText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  releaseNoText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  cardHighlight: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  level: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionHighlight: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
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
