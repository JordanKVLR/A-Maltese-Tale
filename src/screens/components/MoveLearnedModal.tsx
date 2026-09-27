import { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { getMove } from "../../game/movesRepo";
import { useI18n } from "../../i18n";
import { playJingle } from "../../audio/engine";
import { MoveDetailCard } from "./MoveDetailCard";
import { useTapAnywhere } from "./useTapAnywhere";
import { colors } from "../theme";

export interface MoveLearnedNotice {
  displayName: string;
  moveId: string;
}

/**
 * "Calfleaf learned Olive Grove Storm!" — shown every time a creature picks up a move into a
 * free slot, with the move's full card, so a new move is never something that just quietly
 * appears in the list. Tap anywhere to carry on.
 */
export function MoveLearnedModal({ notice, onDismiss }: { notice: MoveLearnedNotice; onDismiss: () => void }) {
  const { t, c } = useI18n();
  useEffect(() => playJingle("levelUp"), [notice.moveId]);
  const dismiss = useTapAnywhere(onDismiss);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable testID="move-learned-modal" style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={dismiss}>
          <Text style={styles.kicker}>{t("learn.newMove")}</Text>
          <Text style={styles.title}>{t("battle.learned", { name: notice.displayName, move: c.move(notice.moveId) })}</Text>
          <ScrollView style={styles.detail}>
            <MoveDetailCard move={getMove(notice.moveId)} />
          </ScrollView>
          <Text style={styles.hint}>{t("common.tapAnywhere")}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "86%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  kicker: {
    color: colors.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  detail: {
    flexGrow: 0,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
