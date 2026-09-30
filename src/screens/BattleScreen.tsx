import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import type { BattleParticipant } from "../game/creatureFactory";
import { buildBiomeEncounterTable, rollEncounter } from "../game/encounterTable";
import { getTrainer, trainerCreatureMoves, completionProgress, GYM_XP_MULTIPLIER, TRAINER_XP_MULTIPLIER, type CompletionProgress } from "../game/trainers";
import { buildParticipant } from "../game/creatureFactory";
import { getDexEntry } from "../game/speciesCatalog";
import { getZoneEncounterSettings } from "../game/zones";
import type { PartyMember, MoveLearnResult } from "../game/party";
import {
  creatureFromPartyMember,
  partyMemberFromParticipant,
  partyMemberStats,
  applyLevelUp,
  remainingPp,
  isOutOfPp,
} from "../game/party";
import { xpRewardForLevel, currencyRewardForLevel } from "../game/progression";
import { getMove, LAST_RESORT_MOVE_ID } from "../game/movesRepo";
import { FESTA_GOLD_MULTIPLIER, isFestaZone } from "../game/festa";
import { collectorMedalsCrossed, ownedCount } from "../game/collection";
import { FRIENDSHIP_GAIN, friendshipOf, friendshipXpBonus } from "../game/friendship";
import { ballItems, catchRateWithCharms, getItem, usableItems } from "../game/itemsRepo";
import type { ItemData } from "../data/schemas";
import { BattleStateMachine, type Winner, type ActionOutcome } from "../engine/battleManager";
import { attemptCatch, type ContainerType } from "../engine/catching";
import { isCruxOnCooldown, CRUX_AURA_STATUS_ID } from "../engine/cruxAura";
import { cruxCharge, cruxReady } from "../engine/cruxMeter";
import { chooseCruxMove } from "../engine/signature";
import { getActiveEffect } from "../engine/statusEffects";
import { getTypeMultiplier } from "../engine/typeChart";
import type { BattleAction, BattleContext, Creature } from "../engine/types";
import { TypeBadge } from "./components/TypeBadge";
import { UiIcon, type UiIconName } from "../art/uiIcons";
import { PrimaryButton } from "./components/PrimaryButton";
import { useCombatantAnimation } from "./components/useCombatantAnimation";
import { BattleStage, PROJECTILE_TRAVEL_MS, BALL_TRAVEL_MS, type BattleStageHandle } from "./components/BattleStage";
import { HoverTip } from "./components/HoverTip";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { LevelUpModal, type LevelUpRevealData } from "./components/LevelUpModal";
import { EvolutionModal, type EvolutionRevealData } from "./components/EvolutionModal";
import { MoveLearnModal, type MoveLearnPrompt } from "./components/MoveLearnModal";
import { MoveLearnedModal, type MoveLearnedNotice } from "./components/MoveLearnedModal";
import { BlackoutOverlay } from "./components/BlackoutOverlay";
import { useTapAnywhere } from "./components/useTapAnywhere";
import { useMusic } from "../audio/useMusic";
import { battleTrack } from "../audio/choose";
import { playJingle } from "../audio/engine";
import { battle as battleSfx } from "../audio/sfx";
import { VictoryOverlay } from "./components/VictoryOverlay";
import { ElementalTransition } from "./components/ElementalTransition";
import { BattleMessage } from "./components/BattleMessage";
import { getMap, findTilePosition } from "../game/mapData";
import { colors, malta } from "./theme";
import { MoveDetailCard } from "./components/MoveDetailCard";
import { useI18n, type StringKey } from "../i18n";
import { useSettings } from "../state/settingsStore";
import { autoAdvanceMs, FASTEST_BEAT_MS, showsPopups, type MessageKind } from "../game/settings";
import { trainerLines } from "../game/trainers";
import type { BoastRef } from "../i18n/boasts";

/** Chance a defeated or caught wild creature drops a Kinnie — rare, never sold. */
const KINNIE_DROP_CHANCE = 0.1;

type Props = NativeStackScreenProps<RootStackParamList, "Battle">;

const WILD_BASE_CATCH_RATE = 190;
const MAX_LOG_LINES = 5;
/** How long the strike plays before its result is shown — long enough to see the hit land. */
const STRIKE_PLAY_MS = 620;

/** One thing the battle has to tell the player, and what happens once it has been read. */
interface BattlePopup {
  /** Unique per popup, so a timer and a tap can never both advance the same one. */
  id: number;
  lines: string[];
  /** Decides, with the pace setting, whether it moves on by itself. */
  kind: MessageKind;
  after?: () => void;
  emphasis?: "none" | "good" | "bad";
}
/** A hit clearing this fraction of max HP counts as a "big" hit for animation purposes. */
const BIG_HIT_FRACTION = 0.25;

type Outcome = Winner | "caught" | "fled";

/** One resolved action queued up for reveal, paired with the battle snapshot
 * exactly as it stood right after that action resolved (captured synchronously
 * inside the engine's onActionResolved callback — ctx has already moved on to
 * reflect BOTH actions by the time reveal playback starts, so this snapshot is
 * the only way to show HP dropping progressively, beat by beat). */
interface RevealBeat {
  outcome: ActionOutcome;
  snapshotAfter: BattleSnapshot;
}

interface BattleRewards {
  money: number;
  xp: number;
  leveledUp: boolean;
  newLevel?: number;
  kinnieDropped?: boolean;
}

interface BattleSnapshot {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerCruxActive: boolean;
  playerCruxOnCooldown: boolean;
  playerCruxCharge: number;
  playerCruxReady: boolean;
  enemyCruxCharge: number;
  enemyCruxActive: boolean;
}

function snapshotFrom(ctx: BattleContext): BattleSnapshot {
  return {
    playerHp: ctx.playerActive.currentHp,
    playerMaxHp: ctx.playerActive.stats.hp,
    enemyHp: ctx.enemyActive.currentHp,
    enemyMaxHp: ctx.enemyActive.stats.hp,
    playerCruxActive: getActiveEffect(ctx.playerActive, CRUX_AURA_STATUS_ID) !== undefined,
    playerCruxOnCooldown: isCruxOnCooldown(ctx.playerActive),
    playerCruxCharge: cruxCharge(ctx.playerActive),
    playerCruxReady: cruxReady(ctx.playerActive),
    enemyCruxCharge: cruxCharge(ctx.enemyActive),
    enemyCruxActive: getActiveEffect(ctx.enemyActive, CRUX_AURA_STATUS_ID) !== undefined,
  };
}

/** A fresh meter, and the move a Crux Aura would unleash, for a creature entering the field. */
function armCrux(creature: BattleContext["playerActive"], moveIds: string[]) {
  creature.cruxCharge = 0;
  creature.cruxMoveId = chooseCruxMove(moveIds.map(getMove));
}

/** The end-of-battle card: a tap anywhere on it goes home, not just on the button. */
function ResultTapCatcher({ onTap, children }: { onTap: () => void; children: React.ReactNode }) {
  const tap = useTapAnywhere(onTap);
  return (
    <Pressable testID="result-overlay" accessibilityRole="button" onPress={tap} style={styles.resultOverlay}>
      {children}
    </Pressable>
  );
}

export function BattleScreen({ navigation, route }: Props) {
  const biome = route.params.biome;
  const selectedLine = useGameStore((s) => s.selectedLine) ?? "Water";
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const inventory = useGameStore((s) => s.inventory);
  const recordBattleResult = useGameStore((s) => s.recordBattleResult);
  const adjustFriendship = useGameStore((s) => s.adjustFriendship);
  /** Read once, as the fight opens: the mark says whether this would be a new catch. */
  const [ownedSpecies] = useState(() => useGameStore.getState().caughtSpeciesIds);
  /** Party members who knocked out at least one foe this fight — they share the win. */
  const fightersRef = useRef(new Set<string>());
  const updatePartyMemberHp = useGameStore((s) => s.updatePartyMemberHp);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const catchCreature = useGameStore((s) => s.catchCreature);
  const markSeen = useGameStore((s) => s.markSeen);
  const earnCurrency = useGameStore((s) => s.earnCurrency);
  const grantExperience = useGameStore((s) => s.grantExperience);
  const addItem = useGameStore((s) => s.addItem);
  const bumpPartyMemberLevel = useGameStore((s) => s.bumpPartyMemberLevel);
  const spendPp = useGameStore((s) => s.spendPp);
  const replacePartyMemberMove = useGameStore((s) => s.replacePartyMemberMove);
  const markTrainerDefeated = useGameStore((s) => s.markTrainerDefeated);
  const awardMedal = useGameStore((s) => s.awardMedal);
  const defeatedTrainerIds = useGameStore((s) => s.defeatedTrainerIds);
  const [completion, setCompletion] = useState<CompletionProgress | null>(null);
  const healFaintedPartyMembers = useGameStore((s) => s.healFaintedPartyMembers);
  const party = useGameStore((s) => s.party);
  const i18n = useI18n();
  const { t, c, plural } = i18n;
  const battlePace = useSettings((s) => s.battlePace);
  // Read through a ref by the turn's continuations, which run long after the render that made them.
  const paceRef = useRef(battlePace);
  paceRef.current = battlePace;
  const textSpeed = useSettings((s) => s.textSpeed);
  const trainerIntros = useSettings((s) => s.trainerIntros);
  const textSize = useSettings((s) => s.textSize);
  /** The move whose details sheet is open, if any. */
  const [inspecting, setInspecting] = useState<string | null>(null);

  const [activeUid] = useState<string | undefined>(() => party.find((m) => m.currentHp > 0)?.uid);
  const activeUidRef = useRef(activeUid);
  const [, forceRerender] = useState(0);
  function setActiveUid(uid: string) {
    activeUidRef.current = uid;
    forceRerender((n) => n + 1);
  }
  const activeMember = party.find((m) => m.uid === activeUidRef.current);

  const encounterTable = useMemo(
    () => buildBiomeEncounterTable(biome, selectedLine, { ...getZoneEncounterSettings(currentZoneId), festa: isFestaZone(currentZoneId) }),
    [biome, selectedLine, currentZoneId]
  );
  const trainer = route.params.trainerId ? getTrainer(route.params.trainerId) : undefined;
  useMusic(battleTrack(trainer));
  const isTrainerBattle = trainer !== undefined;

  /** A trainer sends out their whole party in order; the wild path is a single creature. */
  const enemyTeam = useMemo<BattleParticipant[]>(() => {
    if (trainer) {
      return trainer.party.map((slot, i) => {
        const entry = getDexEntry(slot.speciesId);
        const stats = entry?.stats ?? { hp: 60, atk: 60, def: 60, spatk: 60, spdef: 60, speed: 60 };
        return buildParticipant(
          `foe-${i}-${Math.random().toString(36).slice(2, 6)}`,
          slot.speciesId,
          entry?.name ?? slot.speciesId,
          entry?.types ?? ["Normal"],
          stats,
          slot.level,
          trainerCreatureMoves(slot.speciesId, slot.level)
        );
      });
    }
    return [rollEncounter(encounterTable, `enemy-${Math.random().toString(36).slice(2, 8)}`)];
  }, [trainer, encounterTable]);

  const [enemyIndex, setEnemyIndex] = useState(0);
  const enemy = enemyTeam[Math.min(enemyIndex, enemyTeam.length - 1)];
  /** XP/gold from foes already beaten this battle, banked as each one goes down. */
  const bankedRef = useRef<{ xp: number; money: number; leveledTo?: number }>({ xp: 0, money: 0 });

  const fsmRef = useRef<BattleStateMachine | null>(null);
  if (!fsmRef.current && activeMember) {
    const ctx: BattleContext = {
      playerActive: creatureFromPartyMember(activeMember),
      enemyActive: enemy.creature,
      turnCount: 0,
      fieldEffects: {},
    };
    armCrux(ctx.playerActive, activeMember.moveIds);
    armCrux(ctx.enemyActive, enemy.moveIds);
    fsmRef.current = new BattleStateMachine(ctx, getMove);
    fsmRef.current.start();
  }
  const fsm = fsmRef.current;

  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(() => (fsm ? snapshotFrom(fsm.getContext()) : null));
  const cruxMoveId = fsm?.getContext().playerActive.cruxMoveId;
  const markTutorial = useGameStore((s) => s.markTutorial);
  // One of the trainer's lines, chosen as the battle opens so a rematch does not replay it.
  const [boast] = useState<BoastRef | null>(() => {
    if (!trainer?.boasts?.length) return null;
    return trainer.boasts[Math.floor(Math.random() * trainer.boasts.length)];
  });
  // Trainer fights open on an elemental wipe carrying that line — unless the player has asked
  // for brief introductions. Wild encounters start straight away: the grass has nothing to say.
  const [intro, setIntro] = useState(() => Boolean(trainer) && useSettings.getState().trainerIntros === "full");
  const lines = trainer ? trainerLines(trainer, i18n, boast ?? undefined) : null;
  const [log, setLog] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [rewards, setRewards] = useState<BattleRewards | null>(null);
  const [showParty, setShowParty] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showTraps, setShowTraps] = useState(false);
  const [forcedSwitchPending, setForcedSwitchPending] = useState(false);
  const [resolving, setResolving] = useState(false);
  /**
   * Everything the battle wants to tell the player, one popup at a time.
   *
   * A beat is queued and the next thing happens only once it is done with — which is what
   * `after` carries. Whether "done" means a tap or a moment passing is the Battle pace setting:
   * by default a chosen action plays on its own after a second, and what it did waits to be
   * read. Turn resolution is driven by these, never by a free-running setTimeout chain.
   */
  const [popups, setPopups] = useState<BattlePopup[]>([]);
  const popupIdRef = useRef(0);
  const [levelUpReveal, setLevelUpReveal] = useState<LevelUpRevealData | null>(null);
  /** Takes priority over levelUpReveal — an evolution reveal always plays first, then falls
   * through to the stat-comparison screen once dismissed (see the render's priority chain). */
  const [evolutionReveal, setEvolutionReveal] = useState<EvolutionRevealData | null>(null);
  /** Set when a level-up needs to finish resolving (mutating ctx, consuming the item,
   * continuing the turn) only once the player dismisses the LevelUpModal — e.g. using a
   * Kinnie mid-battle should pause on the stat-comparison screen before the enemy's turn plays. */
  const afterLevelUpDismissRef = useRef<(() => void) | null>(null);

  const playerAnim = useCombatantAnimation();
  const enemyAnim = useCombatantAnimation();
  const stageRef = useRef<BattleStageHandle>(null);
  const [movePrompts, setMovePrompts] = useState<MoveLearnPrompt[]>([]);
  /** Moves learned into a free slot, each announced with its own card before play goes on. */
  const [learnedNotices, setLearnedNotices] = useState<MoveLearnedNotice[]>([]);
  /** The enemy's remaining PP for this battle only — wild creatures aren't persisted. */
  const enemyPpRef = useRef<Record<string, number>>({});

  useEffect(() => {
    markSeen(enemy.creature.speciesId);
  }, [enemy.creature.speciesId, markSeen]);

  /**
   * Records what a level-up did to the moveset: freshly learned moves just get a log line,
   * while moves with nowhere to go queue a prompt shown once the reveal modals are done.
   */
  function queueMoveLearning(member: PartyMember, learning: MoveLearnResult) {
    for (const moveId of learning.learned) {
      pushLog([t("battle.learned", { name: member.displayName, move: c.move(moveId) })]);
    }
    if (learning.learned.length > 0) {
      setLearnedNotices((prev) => [...prev, ...learning.learned.map((moveId) => ({ displayName: member.displayName, moveId }))]);
    }
    if (learning.pending.length > 0) {
      setMovePrompts((prev) => [
        ...prev,
        ...learning.pending.map((moveId) => ({
          uid: member.uid,
          displayName: member.displayName,
          newMoveId: moveId,
          currentMoveIds: member.moveIds,
        })),
      ]);
    }
  }

  /** Wild creatures are "Wild X"; a trainer's creature is just itself. */
  function foeLabel(name: string): string {
    return isTrainerBattle ? name : t("battle.wildName", { name });
  }

  function pushLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines].slice(-MAX_LOG_LINES));
  }

  /**
   * Queues one popup. The lines land in the scrolling log straight away (so the history stays
   * complete) and on screen as a box the player has to dismiss. `after` runs on that dismissal,
   * which is how a turn steps forward.
   */
  function say(
    lines: string[],
    kind: MessageKind,
    options: { after?: () => void; emphasis?: BattlePopup["emphasis"] } = {}
  ) {
    const text = lines.filter(Boolean);
    if (text.length === 0) {
      options.after?.();
      return;
    }
    pushLog(text);
    // Fastest: the log is the whole story, as it was before messages became popups.
    if (!showsPopups(paceRef.current)) {
      options.after?.();
      return;
    }
    popupIdRef.current += 1;
    const popup: BattlePopup = { id: popupIdRef.current, lines: text, kind, ...options };
    setPopups((prev) => [...prev, popup]);
  }

  /** Moves past one popup. Keyed by id, so a tap landing as the timer fires only counts once. */
  function advancePopup(id: number) {
    const current = popups[0];
    if (!current || current.id !== id) return;
    setPopups((prev) => (prev[0]?.id === id ? prev.slice(1) : prev));
    // Run the continuation after the slice so anything it queues lands behind what is left.
    current.after?.();
  }

  /** The enemy is rationed too, so it can't spam a 6-PP heavy hitter all battle. Falls back
   * to Scrap once everything is spent, exactly as the player does. */
  function pickEnemyMoveId(): string {
    const usable = enemy.moveIds.filter((id) => (enemyPpRef.current[id] ?? getMove(id).pp) > 0);
    if (usable.length === 0) return LAST_RESORT_MOVE_ID;
    const chosen = usable[Math.floor(Math.random() * usable.length)];
    enemyPpRef.current[chosen] = (enemyPpRef.current[chosen] ?? getMove(chosen).pp) - 1;
    return chosen;
  }

  /** 10% chance, rolled once per defeated/caught wild creature — Kinnie is never sold, drop-only. */
  function rollKinnieDrop(): boolean {
    const dropped = Math.random() < KINNIE_DROP_CHANCE;
    if (dropped) {
      addItem("kinnie", 1);
      say([t("battle.kinnie", { name: enemy.displayName })], "key", { emphasis: "good" });
    }
    return dropped;
  }

  /**
   * The rewards for one fallen foe, paid the moment it falls rather than saved for the end of
   * the fight: gold, XP, and any level-up it brings — applied to the creature still fighting, so
   * a level gained against a trainer's first creature counts against their second. Returns
   * whether the active creature levelled up (the level-up screens then play before the fight
   * goes on).
   */
  function awardDefeatedFoe(ctx: BattleContext, foeLevel: number): boolean {
    const multiplier = trainer?.rewardMultiplier ?? 1;
    const festaBonus = trainer && isFestaZone(trainer.zoneId) ? FESTA_GOLD_MULTIPLIER : 1;
    const money = Math.round(currencyRewardForLevel(foeLevel) * multiplier * festaBonus);
    earnCurrency(money);
    bankedRef.current.money += money;

    const uid = ctx.playerActive.id;
    fightersRef.current.add(uid);
    // Read the store directly: an earlier foe in this same fight may already have changed it.
    const memberBefore = useGameStore.getState().party.find((m) => m.uid === uid);
    if (!memberBefore) return false;
    // A creature close to you learns faster.
    const xpMultiplier = !trainer ? 1 : trainer.isGymLeader ? GYM_XP_MULTIPLIER : TRAINER_XP_MULTIPLIER;
    const xp = Math.round(
      xpRewardForLevel(foeLevel, memberBefore.level) * xpMultiplier * (1 + friendshipXpBonus(friendshipOf(memberBefore)))
    );
    bankedRef.current.xp += xp;
    const oldStats = partyMemberStats(memberBefore);
    const xpResult = grantExperience(uid, xp);
    say([t("battle.gainedXp", { name: memberBefore.displayName, xp })], "result");
    if (!xpResult?.leveledUp) return false;

    bankedRef.current.leveledTo = xpResult.newLevel;
    const leveled = xpResult.member;
    const newStats = partyMemberStats(leveled);
    // The creature in the fight is a copy; bring it up to date so the new level counts now.
    const hpGain = newStats.hp - ctx.playerActive.stats.hp;
    ctx.playerActive.speciesId = leveled.speciesId;
    ctx.playerActive.types = leveled.types;
    ctx.playerActive.level = leveled.level;
    ctx.playerActive.stats = newStats;
    ctx.playerActive.currentHp = Math.max(1, Math.min(newStats.hp, ctx.playerActive.currentHp + Math.max(0, hpGain)));
    updatePartyMemberHp(uid, ctx.playerActive.currentHp);
    setSnapshot(snapshotFrom(ctx));
    say(
      [
        xpResult.evolution
          ? t("battle.evolved", { old: xpResult.evolution.oldDisplayName, new: xpResult.evolution.newDisplayName })
          : t("battle.grewTo", { name: leveled.displayName, level: leveled.level }),
      ],
      "key",
      { emphasis: "good" }
    );
    if (xpResult.evolution) setEvolutionReveal(xpResult.evolution);
    queueMoveLearning(leveled, xpResult.moveLearning);
    setLevelUpReveal({
      speciesId: leveled.speciesId,
      types: leveled.types,
      displayName: leveled.displayName,
      oldLevel: memberBefore.level,
      newLevel: xpResult.newLevel,
      oldStats,
      newStats,
    });
    return true;
  }

  function finishBattle(result: "player" | "enemy", finalCtx: BattleContext) {
    setOutcome(result);
    // The fight's music stops for its ending; the map picks its own tune back up on return.
    if (result === "enemy") playJingle("blackout", { then: "stop" });
    else playJingle(trainer?.medalId ? "medal" : "victory", { then: "stop" });
    recordBattleResult(result === "player");
    if (result !== "player") return;
    adjustFriendship([...fightersRef.current], FRIENDSHIP_GAIN.battleWon);

    // Every foe was paid for as it fell (awardDefeatedFoe); the card just sums it up.
    const { money, xp, leveledTo } = bankedRef.current;

    if (trainer) {
      markTrainerDefeated(trainer.id);
      say([lines!.defeat], "key", { emphasis: "good" });
      if (trainer.medalId) {
        awardMedal(trainer.medalId);
        say([t("battle.medal", { medal: lines!.medal })], "key", { emphasis: "good" });
      }
      // Beating everyone is the win condition. The store update above is async as far as this
      // render is concerned, so count this trainer in by hand rather than reading it back.
      const progress = completionProgress([...defeatedTrainerIds, trainer.id]);
      if (progress.complete) {
        setCompletion(progress);
        say([t("battle.noOneLeft")], "key", { emphasis: "good" });
      }
    }

    const kinnieDropped = rollKinnieDrop();
    setRewards({ money, xp, leveledUp: leveledTo !== undefined, newLevel: leveledTo, kinnieDropped });
    void finalCtx;
  }

  function handleDismissLevelUp() {
    setLevelUpReveal(null);
  }

  // Whatever waits on a level-up (a trainer's next creature) goes once every screen it brought
  // — the level-up, an evolution, new moves — has been seen.
  useEffect(() => {
    if (levelUpReveal || evolutionReveal || learnedNotices.length > 0 || movePrompts.length > 0) return;
    const pending = afterLevelUpDismissRef.current;
    if (!pending) return;
    afterLevelUpDismissRef.current = null;
    pending();
  }, [levelUpReveal, evolutionReveal, learnedNotices.length, movePrompts.length]);

  // The battle opens with its own messages rather than a pre-filled log. For a trainer the
  // elemental wipe plays first and queues these as it closes, so the order is: wipe, their
  // line, the creature they send out, then your move.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current || trainer) return;
    openedRef.current = true;
    say([t("battle.appeared", { name: enemy.displayName })], "info");
    // Only on mount: this is the battle's opening beat, not something that re-fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openTrainerBattle() {
    if (openedRef.current || !trainer || !lines) return;
    openedRef.current = true;
    say([lines.intro], "info");
    // Brief introductions skip the trainer's line along with the wipe that carries it.
    if (lines.boast && trainerIntros === "full") say([t("battle.says", { name: trainer.name, line: lines.boast })], "info");
    say([t("battle.sendsOutFirst", { name: enemyTeam[0]?.displayName ?? "" })], "info");
  }

  // With brief introductions there is no wipe to open the fight, so open it straight away.
  useEffect(() => {
    if (trainer && !intro) openTrainerBattle();
    // Only on mount, same as the wild opening above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function labelForCreature(creature: Creature, playerActiveId: string): string {
    if (creature.id === playerActiveId) {
      return party.find((m) => m.uid === creature.id)?.displayName ?? t("battle.yourCreature");
    }
    return foeLabel(enemy.displayName);
  }

  /** Extra log lines describing what a move actually did — damage dealt, a miss,
   * crit, type effectiveness, and a faint — matching the mainline games' battle text. */
  function resultLinesFor(outcome: ActionOutcome, playerActiveId: string): string[] {
    if (outcome.action.kind !== "move" || !outcome.target) return [];
    if (!outcome.hit) return [t("battle.missed")];

    const move = getMove(outcome.action.moveId);
    const lines: string[] = [];
    if (outcome.unleashed) lines.push(t("battle.unleashed", { move: c.move(move.id) }));
    else if (outcome.signature) lines.push(t(`battle.signature.${outcome.signature}` as StringKey));

    if (move.category !== "status") {
      lines.push(t("battle.damage", { amount: outcome.damage }));
      if (outcome.crit) lines.push(t("battle.crit"));

      const multiplier = getTypeMultiplier(move.type, outcome.target.types);
      if (multiplier > 1) lines.push(t("battle.superEffective"));
      else if (multiplier > 0 && multiplier < 1) lines.push(t("battle.notVeryEffective"));
      else if (multiplier === 0) lines.push(t("battle.noEffect"));
    }

    lines.push(...statChangeLines(outcome, playerActiveId));

    if (outcome.endured) lines.push(t("battle.endured", { name: labelForCreature(outcome.target, playerActiveId) }));
    if (outcome.target.currentHp <= 0) lines.push(t("battle.fainted", { name: labelForCreature(outcome.target, playerActiveId) }));
    return lines;
  }

  /** Narrates stat stage shifts the way the mainline games do — "X's Attack rose sharply!" —
   * including the case where a stat is already pinned at the end of the -6..+6 table. */
  function statChangeLines(outcome: ActionOutcome, playerActiveId: string): string[] {
    if (!outcome.statChanges?.length) return [];
    return outcome.statChanges.map((change) => {
      const affected = change.target === "self" ? outcome.actor : outcome.target!;
      const who = labelForCreature(affected, playerActiveId);
      const params = { name: who, stat: c.stat(change.stat) };
      if (change.stages === 0) return t("battle.statCapped", params);
      const sharply = Math.abs(change.stages) >= 2;
      if (change.stages > 0) return t(sharply ? "battle.statRoseSharply" : "battle.statRose", params);
      return t(sharply ? "battle.statFellSharply" : "battle.statFell", params);
    });
  }

  /**
   * Resolves one full turn via the engine's onActionResolved callback, which
   * fires synchronously once per actor that actually got to act — in real
   * speed/priority order, and only once (not twice) if the faster actor's hit
   * ends the battle before the slower one can move. Reveal then steps through
   * those captured beats on a delay, one attacker at a time, so a turn always
   * plays out as genuinely sequential single-attacker turns rather than both
   * sides landing at once.
   */
  function runTurn(playerAction: BattleAction, playerLines: string[]) {
    if (!fsm) return;
    const activeFsm = fsm; // re-bind so TS keeps the non-null narrowing inside the nested closures below
    const ctx = activeFsm.getContext();
    const playerActiveId = ctx.playerActive.id;
    // Gym leaders know the old stones too: a full meter is released, not wasted.
    const enemyInvokes = !!trainer?.isGymLeader && cruxReady(ctx.enemyActive);
    const enemyMoveId = enemyInvokes ? "" : pickEnemyMoveId();
    const enemyAction: BattleAction = enemyInvokes
      ? { kind: "invoke_crux", actorId: ctx.enemyActive.id }
      : { kind: "move", actorId: ctx.enemyActive.id, moveId: enemyMoveId };

    const beats: RevealBeat[] = [];
    activeFsm.submitActions(playerAction, enemyAction, (outcome) => {
      beats.push({ outcome, snapshotAfter: snapshotFrom(ctx) });
    });

    setResolving(true);

    function revealBeat(index: number) {
      if (index >= beats.length) {
        finalizeTurn();
        return;
      }
      const { outcome, snapshotAfter } = beats[index];
      const isPlayer = outcome.actor.id === playerActiveId;
      const actingAnim = isPlayer ? playerAnim : enemyAnim;
      const reactingAnim = isPlayer ? enemyAnim : playerAnim;

      const announceLines = isPlayer
        ? playerLines
        : outcome.action.kind === "invoke_crux"
          ? [t("battle.foeCrux", { name: foeLabel(enemy.displayName) })]
          : [t("battle.foeUsed", { name: foeLabel(enemy.displayName), move: c.move(enemyMoveId) })];
      if (!isPlayer && outcome.action.kind === "invoke_crux" && outcome.hit) {
        enemyAnim.cruxGlow();
        stageRef.current?.cruxBurst("enemy");
        battleSfx.crux();
      }

      function applyReaction() {
        playImpact();
        if (outcome.hit && outcome.target) {
          if (outcome.damage > 0) {
            reactingAnim.hit(outcome.damage >= outcome.target.stats.hp * BIG_HIT_FRACTION ? "big" : "small");
          }
          if (outcome.target.currentHp <= 0) reactingAnim.faint();
        }
        setSnapshot(snapshotAfter);
      }

      /** The sound of the strike landing — or not — and of whatever it changed. */
      function playImpact() {
        if (outcome.action.kind !== "move" || !outcome.target) return;
        const move = getMove(outcome.action.moveId);
        if (!outcome.hit) {
          battleSfx.miss(isPlayer);
          return;
        }
        if (move.category !== "status") {
          const multiplier = getTypeMultiplier(move.type, outcome.target.types);
          const effect = multiplier === 0 ? "none" : multiplier > 1 ? "super" : multiplier < 1 ? "weak" : "normal";
          battleSfx.hit(effect, outcome.crit, !isPlayer, move.type);
        }
        const change = outcome.statChanges?.find((c) => c.stages !== 0);
        if (change) setTimeout(() => (change.stages > 0 ? battleSfx.statUp() : battleSfx.statDown()), 180);
        if (outcome.target.currentHp <= 0) setTimeout(() => battleSfx.faint(!isPlayer), 260);
      }

      /** Shows what the move did, then waits for the player before moving on. */
      function reportResult() {
        const fainted = Boolean(outcome.target && outcome.target.currentHp <= 0);
        const emphasis = fainted ? (isPlayer ? "good" : "bad") : "none";
        say(resultLinesFor(outcome, playerActiveId), "result", {
          emphasis,
          after: () => (fastest ? setTimeout(() => revealBeat(index + 1), fastestRest) : revealBeat(index + 1)),
        });
      }

      // Fastest keeps the pre-popup rhythm: the target reacts when the projectile lands, and the
      // next attacker goes FASTEST_BEAT_MS after this one started.
      const fastest = !showsPopups(paceRef.current);
      const strikeMs = fastest ? PROJECTILE_TRAVEL_MS : Math.max(PROJECTILE_TRAVEL_MS, STRIKE_PLAY_MS);
      const fastestRest = Math.max(0, FASTEST_BEAT_MS - (outcome.action.kind === "move" ? strikeMs : 0));

      // Two beats per action: who is doing what, then — after the strike has actually played —
      // what it did. The damage number is never on screen for less time than it takes to read.
      say(announceLines, "action", {
        after: () => {
          if (outcome.action.kind === "move") {
            actingAnim.windUp();
            actingAnim.lunge();
            const move = getMove(outcome.action.moveId);
            battleSfx.attack(move.type, move.category, isPlayer);
            if (outcome.unleashed || outcome.signature) battleSfx.signature(!!outcome.unleashed);
            stageRef.current?.fireProjectile(move.type, isPlayer ? "toEnemy" : "toPlayer", outcome.unleashed ? "unleashed" : outcome.signature ? "signature" : undefined);
            setTimeout(() => {
              applyReaction();
              reportResult();
            }, strikeMs);
          } else {
            applyReaction();
            reportResult();
          }
        },
      });
    }

    function finalizeTurn() {
      const finalSnapshot = snapshotFrom(ctx);
      updatePartyMemberHp(playerActiveId, finalSnapshot.playerHp);
      setResolving(false);
      setSnapshot(finalSnapshot);

      // The first full meter a player ever sees comes with an explanation.
      if (finalSnapshot.playerCruxReady && !useGameStore.getState().tutorialsSeen.includes("crux") && ctx.playerActive.currentHp > 0) {
        markTutorial("crux");
        say([t("battle.cruxTutorial1"), t("battle.cruxTutorial2", { move: c.move(ctx.playerActive.cruxMoveId ?? "tackle") })], "key", { emphasis: "good" });
        battleSfx.statUp();
      }

      if (activeFsm.getState() !== "BATTLE_END") return;

      if (finalSnapshot.enemyHp <= 0) {
        // Pay for this foe now — XP, gold, and any level-up it brings.
        const leveledUp = awardDefeatedFoe(ctx, enemy.creature.level);

        const nextIndex = enemyIndex + 1;
        if (isTrainerBattle && nextIndex < enemyTeam.length) {
          const nextFoe = enemyTeam[nextIndex];
          const sendNext = () => {
            say([t("battle.sendsOut", { trainer: trainer!.name, name: nextFoe.displayName })], "info");
            setEnemyIndex(nextIndex);
            enemyPpRef.current = {};
            // Swap the new foe into the live context and restart the machine around it.
            ctx.enemyActive = nextFoe.creature;
            armCrux(ctx.enemyActive, nextFoe.moveIds);
            setSnapshot(snapshotFrom(ctx));
            enemyAnim.appear();
            activeFsm.restartAfterEnemySwap();
          };
          // A level-up gets its screens before the trainer's next creature comes out.
          if (leveledUp) afterLevelUpDismissRef.current = sendNext;
          else sendNext();
          return;
        }
        finishBattle("player", ctx);
        return;
      }

      if (finalSnapshot.playerHp <= 0) adjustFriendship([playerActiveId], FRIENDSHIP_GAIN.fainted);
      const reserves = party.filter((m) => m.uid !== playerActiveId && m.currentHp > 0);
      if (reserves.length > 0) {
        setForcedSwitchPending(true);
      } else {
        finishBattle("enemy", ctx);
      }
    }

    revealBeat(0);
  }

  function switchTo(uid: string, { forced }: { forced: boolean }) {
    if (!fsm || awaitingAcknowledgement()) return;
    const member = party.find((m) => m.uid === uid);
    if (!member || member.currentHp <= 0 || uid === activeUidRef.current) return;

    const newCreature = creatureFromPartyMember(member);
    armCrux(newCreature, member.moveIds);
    fsm.replacePlayerActive(newCreature);
    setActiveUid(uid);
    setSnapshot(snapshotFrom(fsm.getContext()));
    playerAnim.reset();

    battleSfx.switchIn();
    if (forced) {
      setForcedSwitchPending(false);
      say([t("battle.go", { name: member.displayName })], "action");
    } else {
      setShowParty(false);
      runTurn({ kind: "switch", actorId: newCreature.id, targetPartyIndex: 0 }, [t("battle.go", { name: member.displayName })]);
    }
  }

  /**
   * True whenever the player owes the battle a tap. The message box covers the action area so
   * a stray tap cannot get through, but the keyboard shortcuts talk to these handlers directly
   * — so the rule belongs here rather than only in the layout.
   */
  function awaitingAcknowledgement(): boolean {
    return popups.length > 0;
  }

  function handleMove(moveId: string) {
    if (awaitingAcknowledgement()) return;
    if (outcome || forcedSwitchPending || resolving || !fsm || fsm.getState() !== "ACTION_SELECT") return;
    if (!activeMember) return;
    // Scrap is the free last resort and is never rationed.
    if (moveId !== LAST_RESORT_MOVE_ID) {
      if (remainingPp(activeMember, moveId) <= 0) return;
      spendPp(activeMember.uid, moveId);
    }
    const ctx = fsm.getContext();
    runTurn({ kind: "move", actorId: ctx.playerActive.id, moveId }, [t("battle.youUsed", { move: c.move(moveId) })]);
  }

  function handleInvokeCrux() {
    if (awaitingAcknowledgement()) return;
    if (!fsm || !snapshot || outcome || forcedSwitchPending || resolving) return;
    if (fsm.getState() !== "ACTION_SELECT" || !snapshot.playerCruxReady) return;
    const ctx = fsm.getContext();
    const name = activeMember?.displayName ?? t("battle.yourCreature");
    playerAnim.cruxGlow();
    stageRef.current?.cruxBurst();
    battleSfx.crux();
    runTurn({ kind: "invoke_crux", actorId: ctx.playerActive.id }, [t("battle.crux", { name })]);
  }

  function handleFlee() {
    if (awaitingAcknowledgement()) return;
    if (!fsm || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT") return;
    if (isTrainerBattle) {
      say([t("battle.noRunning")], "info");
      return;
    }
    playerAnim.fleeOut();
    battleSfx.flee();
    say([t("battle.ran")], "info", { after: () => setOutcome("fled") });
  }

  // Revives and treats are for between fights; in battle it's medicine and Kinnie.
  const applicableItems = usableItems().filter(
    (item) => (inventory[item.id] ?? 0) > 0 && (item.effect === "heal" || item.effect === "level_up")
  );

  function handleUseItem(itemId: string) {
    if (awaitingAcknowledgement()) return;
    if (!fsm || !activeMember || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT") return;
    const item = getItem(itemId);
    const ctx = fsm.getContext();
    const name = activeMember.displayName;

    if (item.effect === "heal" && item.healAmount !== undefined) {
      const maxHp = ctx.playerActive.stats.hp;
      const before = ctx.playerActive.currentHp;
      const after = Math.min(maxHp, before + item.healAmount);
      ctx.playerActive.currentHp = after;
      const healedAmount = after - before;

      consumeItem(itemId);
      setShowItems(false);
      playerAnim.heal();
      stageRef.current?.itemFlash("#7ddba0");
      battleSfx.heal();

      runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId }, [
        t("battle.usedItem", { item: c.item(item.id) }),
        t("battle.recovered", { name, amount: healedAmount }),
      ]);
      return;
    }

    if (item.effect === "level_up") {
      const oldStats = partyMemberStats(activeMember);
      const oldLevel = activeMember.level;
      const prevMaxHp = ctx.playerActive.stats.hp;
      // Preview via the same pure function the store will apply on dismiss (see below) — this is
      // how the evolution check (and any resulting species/type/stat change) gets surfaced here,
      // rather than duplicating the level-up math inline.
      const { member: leveledMember, evolution, moveLearning } = applyLevelUp(activeMember);
      queueMoveLearning(leveledMember, moveLearning);
      stageRef.current?.itemFlash("#f3c14a");
      const newStats = partyMemberStats(leveledMember);

      setShowItems(false);
      if (evolution) setEvolutionReveal(evolution);
      setLevelUpReveal({
        speciesId: leveledMember.speciesId,
        types: leveledMember.types,
        displayName: leveledMember.displayName,
        oldLevel,
        newLevel: leveledMember.level,
        oldStats,
        newStats,
      });

      // Defer applying the level-up (and the turn it costs) until the player dismisses
      // the stat-comparison screen — the enemy's move shouldn't play out underneath it.
      afterLevelUpDismissRef.current = () => {
        const hpGain = newStats.hp - prevMaxHp;
        ctx.playerActive.speciesId = leveledMember.speciesId;
        ctx.playerActive.types = leveledMember.types;
        ctx.playerActive.level = leveledMember.level;
        ctx.playerActive.stats = newStats;
        ctx.playerActive.currentHp = Math.min(newStats.hp, ctx.playerActive.currentHp + hpGain);

        consumeItem(itemId);
        bumpPartyMemberLevel(ctx.playerActive.id);
        playerAnim.heal();

        runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId }, [
          t("battle.usedItem", { item: c.item(item.id) }),
          evolution
            ? t("battle.evolved", { old: evolution.oldDisplayName, new: evolution.newDisplayName })
            : t("battle.grewTo", { name, level: leveledMember.level }),
        ]);
      };
    }
  }

  /** Every trap the player actually owns, best first — the chooser lists all of them. */
  const ownedTraps = ballItems().filter((item) => (inventory[item.id] ?? 0) > 0);
  const hasTraps = ownedTraps.length > 0;

  function handleCatch(trap: ItemData) {
    if (awaitingAcknowledgement()) return;
    if (!fsm || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT") return;
    if ((inventory[trap.id] ?? 0) <= 0) return;
    setShowTraps(false);
    const ctx = fsm.getContext();
    const enemyCreature = ctx.enemyActive;

    const result = attemptCatch({
      maxHp: enemyCreature.stats.hp,
      currentHp: enemyCreature.currentHp,
      baseCatchRate: catchRateWithCharms(WILD_BASE_CATCH_RATE, useGameStore.getState().inventory),
      container: trap.id as ContainerType,
      status: enemyCreature.status,
    });
    consumeItem(trap.id);
    const availableBall = trap;
    setResolving(true);
    stageRef.current?.throwBall();
    battleSfx.throwTrap();

    // Wait for the ball to visually arrive before it wobbles and the outcome plays out.
    setTimeout(() => {
      enemyAnim.wobble();
      setResolving(false);
      battleSfx.trapShut();
      for (let i = 0; i < Math.max(1, result.shakesPassed); i++) setTimeout(battleSfx.wobble, 250 + i * 300);

      if (result.caught) {
        setTimeout(() => {
          battleSfx.caughtClick();
          playJingle("caught", { then: "stop" });
        }, 250 + Math.max(1, result.shakesPassed) * 300);
        const member = partyMemberFromParticipant(enemy, "wild");
        const ownedBefore = ownedCount(useGameStore.getState().caughtSpeciesIds);
        const destination = catchCreature(member);
        const ownedAfter = ownedCount(useGameStore.getState().caughtSpeciesIds);
        const money = currencyRewardForLevel(enemy.creature.level);
        earnCurrency(money);
        say(
          [
            t("battle.threw", { item: c.item(availableBall.id) }),
            t("battle.caught", { name: enemy.displayName }),
            ...(destination === "cage" ? [t("battle.caughtToCage", { name: enemy.displayName })] : []),
          ],
          "key",
          { emphasis: "good" }
        );
        // Filling the Codex earns collector medals along the way.
        for (const medal of collectorMedalsCrossed(ownedBefore, ownedAfter)) {
          say([t("collector.earned", { medal: t(`collector.${medal.id}` as StringKey), count: medal.count })], "key", { emphasis: "good" });
        }
        const kinnieDropped = rollKinnieDrop();
        updatePartyMemberHp(ctx.playerActive.id, ctx.playerActive.currentHp);
        setRewards({ money, xp: 0, leveledUp: false, kinnieDropped });
        setOutcome("caught");
        return;
      }

      setTimeout(battleSfx.breakFree, 250 + Math.max(1, result.shakesPassed) * 300);
      runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId: availableBall.id }, [
        plural(result.shakesPassed, "battle.brokeFreeOne", "battle.brokeFreeMany", { item: c.item(availableBall.id) }),
      ]);
    }, BALL_TRAVEL_MS);
  }

  // Nothing is clickable while a message is waiting: the player is reading, not choosing.
  const messageWaiting = popups.length > 0;
  const actionsDisabled = !!outcome || forcedSwitchPending || resolving || messageWaiting;

  useKeyboardShortcuts({
    r: handleFlee,
    b: () => {
      if (!actionsDisabled) setShowItems(true);
    },
    p: () => {
      if (!actionsDisabled) setShowParty(true);
    },
  });

  if (!activeMember || !fsm || !snapshot) {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.resultTitle}>{t("battle.noCreature")}</Text>
        <Text style={styles.resultSubtitle}>{t("battle.noCreatureBody")}</Text>
        <PrimaryButton label={t("battle.returnHome")} onPress={() => navigation.popToTop()} />
      </View>
    );
  }

  const playerMoves = activeMember.moveIds.map(getMove);
  const outOfPp = isOutOfPp(activeMember);
  const lastResortMove = getMove(LAST_RESORT_MOVE_ID);
  const reserves = party.filter((m) => m.uid !== activeMember.uid && m.currentHp > 0);

  return (
    <View style={styles.container}>
      <BattleStage
        ref={stageRef}
        biome={biome}
        enemy={{
          speciesId: enemy.creature.speciesId,
          name: foeLabel(enemy.displayName),
          types: enemy.creature.types,
          level: enemy.creature.level,
          hp: snapshot.enemyHp,
          maxHp: snapshot.enemyMaxHp,
          // Only a trainer's creature will use its meter, so only theirs is worth watching.
          cruxCharge: isTrainerBattle ? snapshot.enemyCruxCharge : undefined,
          owned: isTrainerBattle ? undefined : ownedSpecies.includes(enemy.creature.speciesId),
          highlightCrux: snapshot.enemyCruxActive,
          anim: enemyAnim,
        }}
        player={{
          speciesId: activeMember.speciesId,
          name: activeMember.displayName,
          types: activeMember.types,
          level: activeMember.level,
          hp: snapshot.playerHp,
          maxHp: snapshot.playerMaxHp,
          highlightCrux: snapshot.playerCruxActive,
          cruxCharge: snapshot.playerCruxCharge,
          anim: playerAnim,
        }}
      />

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {log.map((line, i) => (
          <Text key={i} style={[styles.logLine, textSize === "large" && styles.logLineLarge]}>
            {line}
          </Text>
        ))}
      </ScrollView>

      {/* Scrolls rather than clips: on a short phone, a long log or two-line move names
          used to push the last row — Run Away — off the bottom of the screen. */}
      <ScrollView style={styles.actionScroll} contentContainerStyle={styles.actionGrid}>
        {playerMoves.map((move) => {
          const pp = activeMember ? remainingPp(activeMember, move.id) : move.pp;
          const spent = pp <= 0;
          return (
            <HoverTip
              key={move.id}
              style={styles.moveButtonHoverWrap}
              text={t("battle.tip.move", {
                category: t(move.category === "physical" ? "move.physical" : move.category === "special" ? "move.special" : "move.status"),
                type: c.type(move.type),
                power: move.category === "status" ? t("battle.tip.noDamage") : t("battle.tip.power", { power: move.power }),
                accuracy: move.accuracy,
                pp,
                max: move.pp,
              })}
            >
              <Pressable
                testID={`move-${move.id}`}
                onPress={() => handleMove(move.id)}
                disabled={actionsDisabled || spent}
                style={({ pressed }) => [
                  styles.moveButton,
                  move.signature && styles.moveButtonSignature,
                  snapshot.playerCruxActive && move.id === cruxMoveId && styles.moveButtonUnleashed,
                  spent && styles.moveButtonSpent,
                  pressed && !spent && styles.moveButtonPressed,
                ]}
              >
                <Text style={[styles.moveName, spent && styles.moveNameSpent]} numberOfLines={1}>
                  {move.signature ? "★ " : ""}
                  {c.move(move.id)}
                </Text>
                <View style={styles.moveMetaRow}>
                  <TypeBadge type={move.type} compact />
                  {move.category === "status" ? (
                    <Text style={styles.moveMeta}>{t("move.statusShort")}</Text>
                  ) : (
                    <View style={styles.metaPair}>
                      <UiIcon name="power" size={11} color={colors.textMuted} />
                      <Text style={styles.moveMeta}>{move.power}</Text>
                    </View>
                  )}
                  <View style={styles.metaPair}>
                    <UiIcon name="accuracy" size={11} color={colors.textMuted} />
                    <Text style={styles.moveMeta}>{move.accuracy}</Text>
                  </View>
                  <Text style={[styles.movePp, spent && styles.movePpSpent]}>
                    {pp}/{move.pp}
                  </Text>
                </View>
                {/* Opens the full description without spending the turn — the one thing on
                    this button that does not choose the move. */}
                <Pressable
                  testID={`move-info-${move.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("battle.moveInfo")}: ${c.move(move.id)}`}
                  hitSlop={8}
                  onPress={() => setInspecting(move.id)}
                  disabled={!!outcome}
                  style={({ pressed }) => [styles.moveInfoButton, pressed && styles.moveInfoButtonPressed]}
                >
                  <UiIcon name="info" size={14} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            </HoverTip>
          );
        })}
        {outOfPp && (
          <HoverTip
            style={styles.moveButtonHoverWrap}
            text={t("battle.tip.scrap")}
          >
            <Pressable
              testID="move-scrap"
              onPress={() => handleMove(LAST_RESORT_MOVE_ID)}
              disabled={actionsDisabled}
              style={({ pressed }) => [styles.moveButton, styles.scrapButton, pressed && styles.moveButtonPressed]}
            >
              <View style={styles.moveHeaderRow}>
                <Text style={styles.moveName}>{c.move(lastResortMove.id)}</Text>
                <Text style={styles.movePp}>∞</Text>
              </View>
              <Text style={styles.moveMeta}>{t("battle.lastResortMeta")}</Text>
            </Pressable>
          </HoverTip>
        )}
      </ScrollView>

      {/* Everything that isn't a move, as one row of icons that never scrolls away. */}
      <View style={styles.actionBar}>
        <ActionChip
          testID="invoke-crux"
          tip={t("battle.tip.crux")}
          icon="crux"
          label={snapshot.playerCruxActive ? t("battle.chip.cruxActive") : snapshot.playerCruxReady ? t("battle.chip.cruxReady") : t("battle.chip.crux")}
          onPress={handleInvokeCrux}
          disabled={actionsDisabled || !snapshot.playerCruxReady}
          highlight={snapshot.playerCruxReady && !actionsDisabled}
          meter={snapshot.playerCruxCharge}
          meterFull={snapshot.playerCruxReady}
        />
        <ActionChip
          testID="catch-ball"
          tip={t("battle.tip.trap")}
          icon={isTrainerBattle ? "lock" : "trap"}
          label={t("battle.chip.trap")}
          onPress={() => setShowTraps(true)}
          disabled={actionsDisabled || !hasTraps || isTrainerBattle}
        />
        <ActionChip
          testID="open-party-sheet"
          tip={t("battle.tip.party")}
          icon="party"
          label={t("battle.chip.party")}
          onPress={() => setShowParty(true)}
          disabled={actionsDisabled}
        />
        <ActionChip
          testID="open-item-sheet"
          tip={t("battle.tip.item")}
          icon="item"
          label={t("battle.chip.item")}
          onPress={() => setShowItems(true)}
          disabled={actionsDisabled || applicableItems.length === 0}
        />
        <ActionChip
          testID="flee-button"
          tip={isTrainerBattle ? t("battle.tip.cantRun") : t("battle.tip.run")}
          icon={isTrainerBattle ? "lock" : "run"}
          label={t("battle.chip.run")}
          onPress={handleFlee}
          disabled={actionsDisabled || isTrainerBattle}
          danger
        />
      </View>

      <Modal visible={showTraps} transparent animationType="none" onRequestClose={() => setShowTraps(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("battle.whichTrap")}</Text>
            <Text style={styles.sheetNote}>{t("battle.trapSheetNote")}</Text>
            {ownedTraps.map((trap) => (
              <Pressable
                key={trap.id}
                testID={`throw-trap-${trap.id}`}
                onPress={() => handleCatch(trap)}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              >
                <Text style={styles.sheetCreature}>
                  {c.item(trap.id)} <Text style={styles.sheetLevel}>x{inventory[trap.id] ?? 0}</Text>
                </Text>
                <Text style={styles.sheetHp}>{t("battle.catchRate", { value: (trap.catchMultiplier ?? 1).toFixed(1) })}</Text>
              </Pressable>
            ))}
            {ownedTraps.length === 0 && <Text style={styles.sheetNote}>{t("battle.noTrapsInBag")}</Text>}
            <PrimaryButton label={t("common.close")} variant="secondary" onPress={() => setShowTraps(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showItems} transparent animationType="none" onRequestClose={() => setShowItems(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("battle.useItem")}</Text>
            {applicableItems.map((item) => (
              <Pressable
                key={item.id}
                testID={`use-item-${item.id}`}
                onPress={() => handleUseItem(item.id)}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetCreature}>
                  {c.item(item.id)} <Text style={styles.sheetLevel}>x{inventory[item.id] ?? 0}</Text>
                </Text>
                <Text style={styles.sheetHp}>
                  {item.effect === "heal" ? t("common.healPlus", { amount: item.healAmount ?? 0 }) : t("common.levelPlus")}
                </Text>
              </Pressable>
            ))}
            {applicableItems.length === 0 && <Text style={styles.sheetNote}>{t("battle.noItemsInBag")}</Text>}
            <PrimaryButton label={t("common.close")} variant="secondary" onPress={() => setShowItems(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showParty} transparent animationType="none" onRequestClose={() => setShowParty(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("battle.party")}</Text>
            {party.map((member) => {
              const isActive = member.uid === activeMember.uid;
              const fainted = member.currentHp <= 0;
              const hp = isActive ? snapshot.playerHp : member.currentHp;
              return (
                <Pressable
                  key={member.uid}
                  testID={`switch-${member.uid}`}
                  disabled={isActive || fainted}
                  onPress={() => switchTo(member.uid, { forced: false })}
                  style={[styles.sheetRow, (isActive || fainted) && styles.sheetRowDisabled]}
                >
                  <Text style={styles.sheetCreature}>
                    {member.displayName} <Text style={styles.sheetLevel}>{t("common.level", { level: member.level })}</Text>
                  </Text>
                  <Text style={fainted ? styles.sheetFainted : styles.sheetHp}>
                    {fainted
                      ? t("common.fainted")
                      : `${t("common.hp", { hp, max: partyMemberStats(member).hp })}${isActive ? ` ${t("battle.active")}` : ""}`}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.sheetNote}>
              {party.length > 1 ? t("battle.switchHint") : t("battle.noOthers")}
            </Text>
            <PrimaryButton label={t("common.close")} variant="secondary" onPress={() => setShowParty(false)} />
          </View>
        </View>
      </Modal>

      {forcedSwitchPending && (
        <View style={styles.resultOverlay}>
          <Text accessibilityRole="header" style={styles.resultTitle}>{t("battle.fainted", { name: activeMember.displayName })}</Text>
          <Text style={styles.resultSubtitle}>{t("battle.forcedSwitch")}</Text>
          <View style={styles.forcedSwitchList}>
            {reserves.map((member) => (
              <Pressable
                key={member.uid}
                testID={`forced-switch-${member.uid}`}
                onPress={() => switchTo(member.uid, { forced: true })}
                style={({ pressed }) => [styles.forcedSwitchRow, pressed && styles.moveButtonPressed]}
              >
                <Text style={styles.sheetCreature}>
                  {member.displayName} <Text style={styles.sheetLevel}>{t("common.level", { level: member.level })}</Text>
                </Text>
                <Text style={styles.sheetHp}>{t("common.hp", { hp: member.currentHp, max: partyMemberStats(member).hp })}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* The battle's own voice. Everything queued here is read and dismissed before any
          reveal or result modal is allowed to open, so a level-up never lands on top of the
          damage line that caused it. */}
      {messageWaiting && (
        <BattleMessage
          key={popups[0].id}
          lines={popups[0].lines}
          emphasis={popups[0].emphasis}
          remaining={popups.length - 1}
          autoAdvanceMs={autoAdvanceMs(popups[0].kind, { battlePace, textSpeed }, popups[0].lines.length)}
          large={textSize === "large"}
          onAdvance={() => advancePopup(popups[0].id)}
        />
      )}

      {/* A move's full description, opened from its "i" button. Reading it costs nothing. */}
      <Modal visible={inspecting !== null} transparent animationType="fade" onRequestClose={() => setInspecting(null)}>
        <Pressable testID="move-info-backdrop" style={styles.sheetBackdrop} onPress={() => setInspecting(null)}>
          <Pressable style={styles.infoSheet} onPress={(e) => e.stopPropagation()}>
            {inspecting && (
              <MoveDetailCard move={getMove(inspecting)} ppLeft={activeMember ? remainingPp(activeMember, inspecting) : undefined} />
            )}
            <PrimaryButton testID="move-info-close" label={t("common.close")} variant="secondary" onPress={() => setInspecting(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Priority chain: an evolution reveal (if any) plays first, then the level-up stat
          comparison, then the battle result pop-up — each set together but shown one at a time,
          so a level-up (and any evolution it triggers) is never hidden behind the result. */}
      {!messageWaiting &&
        (evolutionReveal ? (
          <EvolutionModal data={evolutionReveal} onDismiss={() => setEvolutionReveal(null)} />
        ) : (
          levelUpReveal && <LevelUpModal data={levelUpReveal} onDismiss={handleDismissLevelUp} />
        ))}

      {!messageWaiting && !evolutionReveal && !levelUpReveal && learnedNotices.length > 0 && (
        <MoveLearnedModal notice={learnedNotices[0]} onDismiss={() => setLearnedNotices((prev) => prev.slice(1))} />
      )}
      {!messageWaiting && !evolutionReveal && !levelUpReveal && learnedNotices.length === 0 && movePrompts.length > 0 && (
        <MoveLearnModal
          prompt={movePrompts[0]}
          onReplace={(forgetMoveId) => {
            replacePartyMemberMove(movePrompts[0].uid, forgetMoveId, movePrompts[0].newMoveId);
            pushLog([
              t("battle.forgotLearned", {
                name: movePrompts[0].displayName,
                old: c.move(forgetMoveId),
                new: c.move(movePrompts[0].newMoveId),
              }),
            ]);
            setMovePrompts((prev) => prev.slice(1));
          }}
          onSkip={() => {
            pushLog([t("battle.didNotLearn", { name: movePrompts[0].displayName, move: c.move(movePrompts[0].newMoveId) })]);
            setMovePrompts((prev) => prev.slice(1));
          }}
        />
      )}

      {intro && trainer && (
        <ElementalTransition
          type={trainer.signatureType}
          trainerName={lines?.fullName ?? trainer.name}
          line={lines?.boast ?? t("battle.defaultLine")}
          onDone={() => {
            setIntro(false);
            openTrainerBattle();
          }}
        />
      )}

      {completion && !messageWaiting && (
        <VictoryOverlay
          trainersBeaten={completion.trainersTotal}
          medalsWon={completion.gymsTotal}
          onContinue={() => setCompletion(null)}
        />
      )}

      {outcome === "enemy" && !messageWaiting && (
        <BlackoutOverlay
          zoneName={c.stage(currentZoneId)}
          onContinue={() => {
            // Wake at the zone's chapel with the party restored — losing costs you your
            // place on the road, not your progress.
            healFaintedPartyMembers();
            const map = getMap(currentZoneId);
            const chapel = findTilePosition(map, "heal") ?? map.playerStart;
            navigation.reset({
              index: 0,
              routes: [{ name: "Map", params: { zoneId: currentZoneId, startAt: chapel } }],
            });
          }}
        />
      )}

      <Modal visible={!!outcome && outcome !== "enemy" && !messageWaiting && !levelUpReveal && !evolutionReveal && movePrompts.length === 0 && learnedNotices.length === 0} transparent animationType="fade" onRequestClose={() => {}}>
        <ResultTapCatcher onTap={() => navigation.popToTop()}>
          <Text accessibilityRole="header" style={styles.resultTitle}>
            {outcome === "player"
              ? t("result.victory")
              : outcome === "caught"
                ? t("result.gotcha")
                : outcome === "fled"
                  ? t("result.gotAway")
                  : t("result.blackedOut")}
          </Text>
          <Text style={styles.resultSubtitle}>
            {outcome === "player" &&
              (trainer && lines
                ? t("result.defeatedTrainer", { name: activeMember.displayName, trainer: lines.fullName })
                : t("result.defeatedWild", { name: activeMember.displayName, foe: enemy.displayName }))}
            {outcome === "caught" && t("result.joined", { name: enemy.displayName })}
            {outcome === "fled" && t("result.fled", { name: enemy.displayName })}
            {outcome === "enemy" && t("result.partyFainted")}
          </Text>
          {rewards && (
            <Text style={styles.rewardsText}>
              {t("result.rewardsMoney", { money: rewards.money })}
              {rewards.xp > 0 ? t("result.rewardsXp", { xp: rewards.xp }) : ""}
              {rewards.leveledUp ? t("result.grewTo", { level: rewards.newLevel ?? 0 }) : ""}
              {rewards.kinnieDropped ? t("result.kinnieDropped") : ""}
            </Text>
          )}
          <PrimaryButton testID="return-to-home" label={t("battle.returnHome")} onPress={() => navigation.popToTop()} />
          <Text style={styles.resultHint}>{t("common.tapAnywhere")}</Text>
        </ResultTapCatcher>
      </Modal>
    </View>
  );
}

/** One of the battle's non-move actions: an icon and a one-word label. The full explanation
 * is in the hover tip, so the button itself stays small. */
function ActionChip({
  testID,
  tip,
  icon,
  label,
  onPress,
  disabled,
  highlight,
  danger,
  meter,
  meterFull,
}: {
  testID: string;
  tip: string;
  icon: UiIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  highlight?: boolean;
  danger?: boolean;
  /** 0–100: a thin bar under the label (the Crux meter). */
  meter?: number;
  meterFull?: boolean;
}) {
  const tint = danger ? colors.danger : highlight ? "#b36b00" : malta.blue;
  return (
    <HoverTip style={styles.chipWrap} text={tip}>
      <Pressable
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.chip,
          highlight && styles.chipHighlight,
          danger && styles.chipDanger,
          disabled && styles.chipDisabled,
          pressed && !disabled && styles.chipPressed,
        ]}
      >
        <UiIcon name={icon} size={20} color={disabled ? colors.textMuted : tint} />
        <Text style={[styles.chipLabel, { color: disabled ? colors.textMuted : tint }]} numberOfLines={1}>
          {label}
        </Text>
        {meter !== undefined && (
          <View style={styles.chipMeter}>
            <View style={[styles.cruxMeterFill, { width: `${Math.round(meter)}%` }, meterFull && styles.cruxMeterFull]} />
          </View>
        )}
      </Pressable>
    </HoverTip>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    gap: 6,
  },
  chipWrap: {
    flex: 1,
  },
  chip: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 8,
    paddingBottom: 7,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#d9c9a8",
    minHeight: 58,
  },
  chipHighlight: {
    backgroundColor: "#fff1c4",
    borderColor: "#e0a516",
  },
  chipDanger: {
    borderColor: "#e8b4ab",
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipPressed: {
    borderBottomWidth: 1.5,
    transform: [{ scale: 0.95 }],
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  chipMeter: {
    alignSelf: "stretch",
    marginHorizontal: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  metaPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  moveInfoButton: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  moveInfoButtonPressed: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDeep,
  },
  moveInfoGlyph: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    fontStyle: "italic",
  },
  infoSheet: {
    width: "100%",
    maxWidth: 440,
    gap: 12,
  },
  logLineLarge: {
    fontSize: 16,
    lineHeight: 23,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 20,
    gap: 12,
  },
  log: {
    // Capped rather than flex:1 — the log only ever holds a few lines, and letting it grow
    // left a tall empty panel between the stage and the move buttons.
    flexGrow: 0,
    minHeight: 84,
    maxHeight: 132,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  logContent: {
    gap: 4,
  },
  logLine: {
    color: colors.text,
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moveButton: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#d9c9a8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  moveButtonPressed: {
    opacity: 0.7,
  },
  moveButtonDisabled: {
    opacity: 0.4,
  },
  moveName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    marginRight: 20,
  },
  moveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  moveMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  moveMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  movePp: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: "auto",
  },
  movePpSpent: {
    color: colors.danger,
  },
  moveNameSpent: {
    color: colors.textMuted,
  },
  /** A spent move stays visible (so you can see what you have) but reads as unavailable. */
  moveButtonSpent: {
    opacity: 0.5,
    borderStyle: "dashed",
  },
  scrapButton: {
    borderColor: colors.danger,
  },
  cruxButton: {
    borderColor: colors.accent,
  },
  // A signature move wears gold; the move an active Crux Aura unleashes burns brighter still.
  moveButtonSignature: {
    borderColor: "#d9a520",
    borderWidth: 2,
  },
  moveButtonUnleashed: {
    backgroundColor: "#fff1c4",
    borderColor: "#f39c12",
    borderWidth: 3,
  },
  cruxButtonReady: {
    backgroundColor: "#fff4d6",
    borderColor: "#e0a516",
    borderWidth: 2,
  },
  cruxMeterTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    marginTop: 4,
  },
  cruxMeterFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#e8b93c",
  },
  cruxMeterFull: {
    backgroundColor: "#f39c12",
  },
  catchButton: {
    borderColor: colors.success,
  },
  cruxHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  /** Party, Use Item and Run share the last row, so Run is always in reach. */
  partyButtonHalf: {
    flexBasis: "28%",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  thirdWrap: {
    flexGrow: 1,
    flexBasis: "28%",
  },
  actionScroll: {
    flex: 1,
  },
  fleeButton: {
    flexBasis: "28%",
    alignItems: "center",
    paddingHorizontal: 8,
    borderColor: colors.danger,
  },
  moveButtonHoverWrap: {
    flexGrow: 1,
    flexBasis: "45%",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetRowPressed: {
    backgroundColor: colors.surfaceAlt,
    transform: [{ scale: 0.99 }],
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetRowDisabled: {
    opacity: 0.5,
  },
  sheetCreature: {
    color: colors.text,
    fontSize: 15,
  },
  sheetLevel: {
    color: colors.textMuted,
    fontWeight: "400",
    fontSize: 12,
  },
  sheetHp: {
    color: colors.textMuted,
    fontSize: 14,
  },
  sheetFainted: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetNote: {
    color: colors.textMuted,
    fontSize: 12,
  },
  forcedSwitchList: {
    width: "100%",
    gap: 10,
  },
  forcedSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
  },
  resultHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13,27,42,0.95)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  resultSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  rewardsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
