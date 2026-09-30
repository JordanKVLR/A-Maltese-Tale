import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import {
  getMap,
  isWalkable,
  biomeAt,
  isExitTile,
  isEntranceTile,
  isHealTile,
  findTilePosition,
} from "../game/mapData";
import { TileArt, PlayerSprite, TrainerSprite, NpcSprite, GlintSprite, PortalSprite, CageSprite } from "../art/tileArt";
import { featuresForZone, npcAt, glintAt, portalInto, cageAt, type MapGlint, type MapNpc } from "../game/mapFeatures";
import { findIsVisible, getQuest, questForFind, questProgress, questState } from "../game/quests";
import { findName, questGiver, questLine, questTitle, stepLabel } from "../game/questText";
import { questWorldOf } from "../state/gameStore";
import { friendshipOf, friendshipTier } from "../game/friendship";
import { FESTA_GIFT, festaOn } from "../game/festa";
import { Fireworks2D } from "./components/Fireworks2D";
import { MoveLearnModal, type MoveLearnPrompt } from "./components/MoveLearnModal";
import { trainerAt, trainersForZone } from "../game/trainers";
import { medalRequiredToEnter, getStage, STAGES } from "../game/zoneProgression";
import { briefingsOnEntry, type BriefingPage } from "../game/briefings";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { BriefingModal } from "./components/BriefingModal";
import { ScreenBackground } from "./components/ScreenBackground";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { useMapLayout } from "./components/useMapLayout";
import { useSettings } from "../state/settingsStore";
import { encounterChance, type ControlSide } from "../game/settings";
import { useMusic } from "../audio/useMusic";
import { mapTrack } from "../audio/choose";
import { Map3D } from "./components/Map3D";
import { supports3D } from "../three/support";
import { playJingle } from "../audio/engine";
import { ui, world as worldSfx } from "../audio/sfx";
import { useI18n, currentI18n } from "../i18n";
import { colors, world } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

/** Base 0.15, bumped 30% per request. */
const ENCOUNTER_CHANCE = 0.195;
/** Screen-flash transition before cutting to Battle — a burst of quick flashes,
 * matching the classic "surprise encounter" screen-flash from the mainline games. */
const ENCOUNTER_FLASH_SEQUENCE = [1, 0, 1, 0, 1, 0, 1];
const ENCOUNTER_FLASH_STEP_MS = 90;
/** Reduced motion: one slow fade to white and back instead of seven fast strobes. */
const GENTLE_FLASH_SEQUENCE = [0.85, 0];
const GENTLE_FLASH_STEP_MS = 320;
const DRAWER_WIDTH = 116;
const TOTAL_STAGES = STAGES.length;
/** Walking feedback ("trees block the path") is a passing note, not something to dismiss. */
const TOAST_MS = 1800;
const DPAD_BUTTON = 52;
/** How close you have to be to see a glint — unless you carry the Għajn Charm. */
const GLINT_SIGHT = 3;

/** Where the movement control sits, per the player's thumb preference in Settings. */
const SIDE_STYLE: Record<ControlSide, { alignItems: "flex-start" | "center" | "flex-end" }> = {
  left: { alignItems: "flex-start" },
  center: { alignItems: "center" },
  right: { alignItems: "flex-end" },
};

type Direction = "up" | "down" | "left" | "right";

const DIRECTION_DELTA: Record<Direction, { dRow: number; dCol: number }> = {
  up: { dRow: -1, dCol: 0 },
  down: { dRow: 1, dCol: 0 },
  left: { dRow: 0, dCol: -1 },
  right: { dRow: 0, dCol: 1 },
};

/**
 * Camera translation for one axis. Positions are tracked in tiles rather than pixels, so the
 * same walk animation stays correct when the tile size changes under it — rotating a phone, or
 * dragging a laptop window from one layout to the other. The camera follows the player,
 * centred, and clamps at the zone's edges so it never shows past the map. A zone that fits
 * entirely is simply centred in the viewport.
 */
function cameraOffset(playerTile: Animated.Value, mapTiles: number, viewportPx: number, tile: number) {
  const mapPx = mapTiles * tile;
  if (mapPx <= viewportPx) return (viewportPx - mapPx) / 2;
  const halfTiles = (viewportPx - tile) / 2 / tile;
  const travel = mapPx - viewportPx;
  return playerTile.interpolate({
    inputRange: [0, halfTiles, halfTiles + travel / tile, mapTiles - 1],
    outputRange: [0, 0, -travel, -travel],
    extrapolate: "clamp",
  });
}

export function MapScreen({ navigation, route }: Props) {
  const map = getMap(route.params.zoneId);
  // Normally the zone's own default spawn point — but when walking back into a zone via its
  // entrance tile, this is the exact exit tile the player used to leave it in the first place.
  const startPosition = route.params.startAt ?? map.playerStart;
  const setCurrentZone = useGameStore((s) => s.setCurrentZone);
  const healFaintedPartyMembers = useGameStore((s) => s.healFaintedPartyMembers);
  const party = useGameStore((s) => s.party);
  const medals = useGameStore((s) => s.medals);
  const defeatedTrainerIds = useGameStore((s) => s.defeatedTrainerIds);
  const controlSide = useSettings((s) => s.controlSide);
  const showFollower = useSettings((s) => s.showFollower);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const i18n = useI18n();
  const { t, c } = i18n;
  const markStageVisited = useGameStore((s) => s.markStageVisited);
  const quests = useGameStore((s) => s.quests);
  const catchesByType = useGameStore((s) => s.catchesByType);
  const foundIds = useGameStore((s) => s.foundIds);
  const inventory = useGameStore((s) => s.inventory);
  const visitedStageIds = useGameStore((s) => s.visitedStageIds);
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const completeQuest = useGameStore((s) => s.completeQuest);
  const collectFind = useGameStore((s) => s.collectFind);
  const teachSignature = useGameStore((s) => s.teachSignature);
  const replacePartyMemberMove = useGameStore((s) => s.replacePartyMemberMove);
  const questWorld = questWorldOf({ quests, catchesByType, defeatedTrainerIds, foundIds, party, medals, visitedStageIds });
  const features = featuresForZone(map.zoneId);
  const hasCharm = (inventory.il_ghajn_charm ?? 0) > 0;
  const [learnPrompt, setLearnPrompt] = useState<MoveLearnPrompt | null>(null);
  const [festa] = useState(() => festaOn());
  const festaHere = festa.zoneId === map.zoneId && !getStage(map.zoneId)?.bonus;
  /** The festa greeting waits for any stage briefing to be read first. */
  const festaPending = useRef<BriefingPage | null>(null);

  const mapCols = map.rows[0].length;
  const mapRows = map.rows.length;
  const layout = useMapLayout(mapCols, mapRows);
  const tile = layout.tileSize;
  const compact = layout.mode === "compact";

  const [position, setPosition] = useState(startPosition);
  const [facing, setFacing] = useState<Direction>("down");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Decided once, as the zone opens: the store marks the stage visited when the briefing is
  // dismissed, and the briefing must not vanish mid-read when that lands.
  const [briefing, setBriefing] = useState<BriefingPage[]>(() =>
    briefingsOnEntry(map.zoneId, useGameStore.getState().visitedStageIds, currentI18n(), {
      stageBriefings: useSettings.getState().stageBriefings,
    })
  );
  /** A one-off notice that has to be acknowledged — the chapel, a barred gate, a quest-giver. */
  const [notice, setNoticePages] = useState<BriefingPage[] | null>(null);
  const afterNotice = useRef<(() => void) | null>(null);
  const setNotice = (page: BriefingPage | BriefingPage[] | null, then?: () => void) => {
    afterNotice.current = then ?? null;
    setNoticePages(page === null ? null : Array.isArray(page) ? page : [page]);
  };
  const closeNotice = () => {
    const then = afterNotice.current;
    afterNotice.current = null;
    setNoticePages(null);
    then?.();
  };
  const isFocused = useIsFocused();
  const modalOpen = briefing.length > 0 || notice !== null || learnPrompt !== null;

  // Positions in tile units; multiplied out by the current tile size at render.
  const anim = useRef(new Animated.ValueXY({ x: startPosition.col, y: startPosition.row })).current;
  /** The lead creature walks one tile behind, so it animates to where the player just was. */
  const followerAnim = useRef(new Animated.ValueXY({ x: startPosition.col, y: startPosition.row })).current;
  const encounterFlash = useRef(new Animated.Value(0)).current;
  const healGlow = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const leadCreature = party.find((m) => m.currentHp > 0) ?? party[0];
  const leadHappy = !!leadCreature && ["close", "devoted"].includes(friendshipTier(friendshipOf(leadCreature)));
  const heartPop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!leadHappy || reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPop, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(heartPop, { toValue: 0, duration: 500, useNativeDriver: false }),
        Animated.delay(4800),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [leadHappy, reducedMotion, heartPop]);
  const trainers = trainersForZone(map.zoneId);
  const graphics = useSettings((s) => s.graphics);
  const use3D = Platform.OS === "web" && graphics === "3d" && supports3D();
  const stage = getStage(map.zoneId);
  const zoneBiome = stage?.biomes[0] ?? "grass";
  useMusic(mapTrack(stage));

  // A first visit announces itself with a little bell phrase as the briefing unrolls.
  useEffect(() => {
    if (briefing.length === 0) return;
    const timer = setTimeout(() => {
      worldSfx.newStage();
      ui.scroll();
    }, 250);
    return () => clearTimeout(timer);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // A zone with nothing to say is still a zone the player has now been to.
  useEffect(() => {
    if (briefing.length === 0) markStageVisited(map.zoneId);
    // Only on arrival; dismissing a briefing marks it separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishBriefing() {
    markStageVisited(map.zoneId);
    setBriefing([]);
    if (festaPending.current) {
      setNotice(festaPending.current);
      festaPending.current = null;
    }
  }

  // The first visit of the day to the festa: a greeting and a gift.
  useEffect(() => {
    if (!festaHere) return;
    if (!useGameStore.getState().claimFestaGift(festa.day, FESTA_GIFT.itemId, FESTA_GIFT.quantity)) return;
    const feast = t(`festa.name.${festa.feastId}`);
    const page: BriefingPage = {
      id: "festa",
      kicker: t("festa.kicker"),
      title: feast,
      lines: [t("festa.line1", { feast }), t("festa.line2"), t("festa.gift", { quantity: FESTA_GIFT.quantity, item: c.item(FESTA_GIFT.itemId) })],
    };
    if (briefing.length > 0) festaPending.current = page;
    else setNotice(page);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDrawer(open: boolean) {
    setDrawerOpen(open);
    Animated.spring(drawerAnim, { toValue: open ? 1 : 0, useNativeDriver: false, friction: 8 }).start();
  }

  const cameraX = cameraOffset(anim.x, mapCols, layout.viewportWidth, tile);
  const cameraY = cameraOffset(anim.y, mapRows, layout.viewportHeight, tile);
  const toPx = (v: Animated.Value) => Animated.multiply(v, tile);

  function flashSequence() {
    const [steps, ms] = reducedMotion
      ? [GENTLE_FLASH_SEQUENCE, GENTLE_FLASH_STEP_MS]
      : [ENCOUNTER_FLASH_SEQUENCE, ENCOUNTER_FLASH_STEP_MS];
    return steps.map((toValue) => Animated.timing(encounterFlash, { toValue, duration: ms, useNativeDriver: false }));
  }

  const markerFor = (npc: MapNpc): "!" | "?" | null => {
    const quest = getQuest(npc.questId);
    if (!quest) return null;
    const state = questState(quest, questWorld);
    return state === "available" || state === "unknown" ? "!" : state === "ready" ? "?" : null;
  };
  const glintShown = (glint: MapGlint) =>
    findIsVisible(glint.findId, questWorld) &&
    (hasCharm || Math.max(Math.abs(glint.row - position.row), Math.abs(glint.col - position.col)) <= GLINT_SIGHT);

  /** Walking into a quest-giver: what they say depends on where their quest stands. */
  function talk(npc: MapNpc) {
    const quest = getQuest(npc.questId);
    if (!quest) return;
    const title = questTitle(quest, i18n);
    const giver = questGiver(quest, i18n);
    const state = questState(quest, questWorld);
    const page = (id: string, kicker: string, lines: string[]): BriefingPage => ({ id, kicker, title, lines });
    ui.message();
    if (state === "available" || state === "unknown") {
      setNotice(page("quest-offer", giver, [questLine(quest, "offer1", i18n), questLine(quest, "offer2", i18n)]), () => {
        acceptQuest(quest.id);
        worldSfx.newStage();
        setToast(t("map.npc.newQuest", { quest: title }));
      });
    } else if (state === "locked") {
      setNotice(page("quest-locked", giver, [questLine(quest, "offer1", i18n), t("map.npc.locked", { medal: c.medal(quest.requiresMedal!) })]));
    } else if (state === "active") {
      const todo = questProgress(quest, questWorld).filter((p) => !p.done).map((p) => `• ${stepLabel(p, i18n)}`);
      setNotice(page("quest-remind", giver, [t("map.npc.remind"), ...todo]));
    } else if (state === "ready") {
      if (!completeQuest(quest.id)) return;
      playJingle("medal");
      const lines = [
        questLine(quest, "thanks", i18n),
        t("quest.received", { item: c.item(quest.reward.keyItemId), gold: quest.reward.gold }),
      ];
      let then: (() => void) | undefined;
      if (quest.reward.keyItemId === "signature_scroll") {
        const taught = teachSignature();
        if (taught?.status === "learned") {
          const member = useGameStore.getState().party.find((m) => m.uid === taught.uid);
          const moveId = member?.moveIds[member.moveIds.length - 1];
          if (member && moveId) lines.push(t("quest.signatureLearned", { name: member.displayName, move: c.move(moveId) }));
        } else if (taught?.status === "full") {
          then = () =>
            setLearnPrompt({
              uid: taught.member.uid,
              displayName: taught.member.displayName,
              newMoveId: taught.moveId,
              currentMoveIds: taught.member.moveIds,
            });
        }
      }
      setNotice({ id: "quest-complete", kicker: t("quest.completeKicker"), title, lines }, then);
    } else {
      setNotice(page("quest-after", giver, [t("map.npc.after")]));
    }
  }

  /** Stepping onto a glint picks it up. */
  function pickUp(glint: MapGlint) {
    collectFind(glint.findId, glint.treasure);
    const quest = questForFind(glint.findId);
    let line: string;
    if (quest) {
      playJingle("caught");
      line = t("map.find.quest", { thing: findName(glint.findId, i18n), giver: questGiver(quest, i18n) });
    } else if (glint.treasure?.gold) {
      ui.coin();
      line = t("map.find.gold", { gold: glint.treasure.gold });
    } else {
      ui.coin();
      line = t("map.find.item", { quantity: glint.treasure?.quantity ?? 1, item: c.item(glint.treasure?.itemId ?? "") });
    }
    setNotice({ id: "find", kicker: t("map.find.kicker"), title: quest ? questTitle(quest, i18n) : c.stage(map.zoneId), lines: [line] });
  }

  function travel(zoneId: string, startAt?: { row: number; col: number }) {
    setCurrentZone(zoneId);
    navigation.reset({ index: 0, routes: [{ name: "Map", params: startAt ? { zoneId, startAt } : { zoneId } }] });
  }

  function move(direction: Direction) {
    if (busy || modalOpen) return;
    setFacing(direction);
    const { dRow, dCol } = DIRECTION_DELTA[direction];
    const next = { row: position.row + dRow, col: position.col + dCol };

    if (!isWalkable(map, next.row, next.col)) {
      worldSfx.bump();
      setToast(t("map.treesBlock"));
      return;
    }

    // A trainer you walk into stops you where you are and challenges, rather than letting you
    // walk through them.
    const npc = npcAt(map.zoneId, next.row, next.col);
    if (npc) {
      talk(npc);
      return;
    }

    const blocker = trainerAt(map.zoneId, next.row, next.col);
    if (blocker && !defeatedTrainerIds.includes(blocker.id)) {
      worldSfx.spotted();
      setBusy(true);
      const flashes = flashSequence();
      Animated.sequence(flashes).start(() => {
        encounterFlash.setValue(0);
        setBusy(false);
        // The biome only picks the backdrop here; a trainer fight isn't tied to terrain, so
        // use the zone's own primary biome.
        navigation.navigate("Battle", { biome: zoneBiome, trainerId: blocker.id });
      });
      return;
    }

    setToast(null);
    // Follower steps into the tile being vacated, one beat behind the player.
    Animated.timing(followerAnim, {
      toValue: { x: position.col, y: position.row },
      duration: 150,
      useNativeDriver: false,
    }).start();
    setPosition(next);
    setBusy(true);
    worldSfx.step();
    Animated.timing(anim, {
      toValue: { x: next.col, y: next.row },
      duration: 150,
      useNativeDriver: false, // animating a plain View position, not a native-driver-eligible property
    }).start(() => {
      // A hidden area has no road onward: either gate leads back to where you came in.
      if (stage?.bonus && (isExitTile(map, next.row, next.col) || isEntranceTile(map, next.row, next.col))) {
        const back = portalInto(map.zoneId);
        travel(stage.bonus.fromZoneId, back ? { row: back.row, col: back.col } : undefined);
        return;
      }

      const glint = glintAt(map.zoneId, next.row, next.col);
      if (glint && findIsVisible(glint.findId, questWorld)) {
        pickUp(glint);
        setBusy(false);
        return;
      }

      if (cageAt(map.zoneId, next.row, next.col)) {
        ui.open();
        setBusy(false);
        navigation.navigate("Cage");
        return;
      }

      const portal = features.portal;
      if (portal && portal.row === next.row && portal.col === next.col) {
        const open = (inventory[portal.keyItemId] ?? 0) > 0;
        const kind = portal.kind;
        if (open) ui.confirm();
        else ui.blocked();
        setNotice(
          {
            id: "portal",
            kicker: t(`map.portal.${kind}.kicker`),
            title: open ? c.stage(portal.toZoneId) : t(`map.portal.${kind}.title`),
            lines: [open ? t(`map.portal.${kind}.go`) : t(`map.portal.${kind}.locked`)],
          },
          open ? () => travel(portal.toZoneId) : undefined
        );
        setBusy(false);
        return;
      }

      if (isExitTile(map, next.row, next.col) && map.exitTo) {
        const gate = medalRequiredToEnter(map.exitTo);
        if (gate && !medals.includes(gate.medalId)) {
          const medal = c.medal(gate.medalId);
          ui.blocked();
          setNotice({
            id: "gate",
            kicker: t("map.gate.kicker"),
            title: t("map.gate.title", { medal }),
            lines: [t("map.gate.line1", { medal }), t("map.gate.line2", { leader: gate.leaderName })],
          });
          setBusy(false);
          return;
        }
        setCurrentZone(map.exitTo);
        // reset (not push): Map is the app's default/root screen, so moving
        // to a new zone replaces the stack's root with a fresh Map instance
        // for that zone rather than growing an ever-longer push chain.
        navigation.reset({ index: 0, routes: [{ name: "Map", params: { zoneId: map.exitTo } }] });
        return;
      }

      // Walking back onto the entrance tile (where you originally spawned in this zone) returns
      // to the previous zone, landing exactly on the exit tile used to leave it — not that zone's
      // own default spawn point, so the round trip feels continuous rather than resetting you.
      if (isEntranceTile(map, next.row, next.col) && map.previousZoneId) {
        const prevMap = getMap(map.previousZoneId);
        const startAt = findTilePosition(prevMap, "exit") ?? prevMap.playerStart;
        setCurrentZone(map.previousZoneId);
        navigation.reset({ index: 0, routes: [{ name: "Map", params: { zoneId: map.previousZoneId, startAt } }] });
        return;
      }

      if (isHealTile(map, next.row, next.col)) {
        const healedCount = healFaintedPartyMembers();
        if (healedCount > 0) playJingle("heal");
        else ui.message();
        setNotice({
          id: "chapel",
          kicker: t("map.chapel.kicker"),
          title: healedCount > 0 ? t("map.chapel.restored") : t("map.chapel.quiet"),
          lines: [
            healedCount === 0
              ? t("map.chapel.rested")
              : healedCount === 1
                ? t("map.chapel.healedOne")
                : t("map.chapel.healedMany", { count: healedCount }),
          ],
        });
        if (healedCount > 0) {
          // A green wash over the scene so healing registers as an event, not a line of text.
          Animated.sequence([
            Animated.timing(healGlow, { toValue: 1, duration: 260, useNativeDriver: false }),
            Animated.timing(healGlow, { toValue: 0, duration: 520, useNativeDriver: false }),
          ]).start();
        }
        setBusy(false);
        return;
      }

      const biome = biomeAt(map, next.row, next.col);
      if (biome && Math.random() < encounterChance(ENCOUNTER_CHANCE, useSettings.getState().encounterRate)) {
        // Screen-flash transition before cutting to Battle — busy stays true
        // for the whole sequence so the player can't walk away mid-flash.
        worldSfx.encounter();
        const flashAnimations = flashSequence();
        Animated.sequence(flashAnimations).start(() => {
          encounterFlash.setValue(0);
          setBusy(false);
          navigation.navigate("Battle", { biome });
        });
        return;
      }

      setBusy(false);
    });
  }

  // While a briefing or notice is up, the keyboard goes nowhere — the same rule as the battle.
  const guarded = (fn: () => void) => () => {
    if (!modalOpen) fn();
  };
  useKeyboardShortcuts({
    ArrowUp: () => move("up"),
    ArrowDown: () => move("down"),
    ArrowLeft: () => move("left"),
    ArrowRight: () => move("right"),
    b: guarded(() => navigation.navigate("Bag")),
    p: guarded(() => navigation.navigate("Party")),
    m: guarded(() => navigation.navigate("Home")),
  });

  const entitySize = { width: tile, height: tile };
  const dpadActive = isFocused && !modalOpen && !drawerOpen;

  const world_ = (
    <View
      testID="map-viewport"
      style={[
        styles.viewport,
        compact ? styles.viewportCompact : styles.viewportWide,
        { width: layout.viewportWidth, height: layout.viewportHeight },
      ]}
    >
      {use3D && (
        <Map3D
          map={map}
          player={anim}
          follower={followerAnim}
          facing={facing}
          lead={leadCreature && showFollower ? { speciesId: leadCreature.speciesId, types: leadCreature.types, happy: leadHappy } : null}
          trainers={trainers.map((trainer) => ({
            id: trainer.id,
            row: trainer.position.row,
            col: trainer.position.col,
            isGymLeader: !!trainer.isGymLeader,
            defeated: defeatedTrainerIds.includes(trainer.id),
          }))}
          festa={festaHere}
          features={{
            npcs: features.npcs.map((npc) => ({
              id: npc.questId,
              row: npc.row,
              col: npc.col,
              look: getQuest(npc.questId)!.giver.look,
              marker: markerFor(npc),
            })),
            glints: features.glints.map((g) => ({ id: g.findId, row: g.row, col: g.col, quest: !g.treasure, visible: glintShown(g) })),
            cage: features.cage,
            portal: features.portal
              ? { row: features.portal.row, col: features.portal.col, kind: features.portal.kind, open: (inventory[features.portal.keyItemId] ?? 0) > 0 }
              : null,
          }}
        />
      )}
      {!use3D && (
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: mapCols * tile,
          height: mapRows * tile,
          transform: [{ translateX: cameraX }, { translateY: cameraY }],
        }}
      >
        {map.rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((tileType, colIndex) => (
              <View key={colIndex} style={entitySize}>
                <TileArt type={tileType} seed={rowIndex * 31 + colIndex * 17} size={tile} />
              </View>
            ))}
          </View>
        ))}
        {trainers.map((trainer) => (
          <View
            key={trainer.id}
            testID={`trainer-${trainer.id}`}
            style={[styles.entity, entitySize, { left: trainer.position.col * tile, top: trainer.position.row * tile }]}
          >
            <TrainerSprite
              size={tile}
              isGymLeader={trainer.isGymLeader}
              defeated={defeatedTrainerIds.includes(trainer.id)}
            />
          </View>
        ))}

        {features.cage && (
          <View
            testID="map-cage"
            style={[styles.entity, entitySize, { left: features.cage.col * tile, top: features.cage.row * tile }]}
          >
            <CageSprite size={tile} />
          </View>
        )}
        {features.portal && (
          <View
            testID="map-portal"
            style={[styles.entity, entitySize, { left: features.portal.col * tile, top: features.portal.row * tile }]}
          >
            <PortalSprite size={tile} kind={features.portal.kind} open={(inventory[features.portal.keyItemId] ?? 0) > 0} />
          </View>
        )}
        {features.glints.filter(glintShown).map((glint) => (
          <View
            key={glint.findId}
            testID={`glint-${glint.findId}`}
            pointerEvents="none"
            style={[styles.entity, entitySize, { left: glint.col * tile, top: glint.row * tile }]}
          >
            <GlintSprite size={tile * 0.8} quest={!glint.treasure} />
          </View>
        ))}
        {features.npcs.map((npc) => (
          <View
            key={npc.questId}
            testID={`npc-${npc.questId}`}
            style={[styles.entity, entitySize, { left: npc.col * tile, top: npc.row * tile }]}
          >
            <NpcSprite size={tile} look={getQuest(npc.questId)!.giver.look} marker={markerFor(npc)} />
          </View>
        ))}

        {leadCreature && showFollower && (
          <Animated.View
            testID="follower-creature"
            pointerEvents="none"
            style={[
              styles.entity,
              entitySize,
              { transform: [{ translateX: toPx(followerAnim.x) }, { translateY: toPx(followerAnim.y) }] },
            ]}
          >
            <CreatureAvatar speciesId={leadCreature.speciesId} types={leadCreature.types} size={tile * 0.72} />
            {leadHappy && (
              <Animated.Text
                testID="follower-heart"
                style={[
                  styles.heart,
                  { opacity: heartPop, transform: [{ translateY: heartPop.interpolate({ inputRange: [0, 1], outputRange: [0, -tile * 0.35] }) }] },
                ]}
              >
                ♥
              </Animated.Text>
            )}
          </Animated.View>
        )}

        <Animated.View
          testID="player-avatar"
          style={[
            styles.entity,
            entitySize,
            { transform: [{ translateX: toPx(anim.x) }, { translateY: toPx(anim.y) }] },
          ]}
        >
          <PlayerSprite facing={facing} size={tile} />
        </Animated.View>
      </Animated.View>
      )}

      {festaHere && !use3D && !reducedMotion && <Fireworks2D />}
      <Animated.View testID="encounter-flash" pointerEvents="none" style={[styles.wash, { opacity: encounterFlash }]} />
      <Animated.View
        testID="heal-glow"
        pointerEvents="none"
        style={[styles.wash, styles.healGlow, { opacity: healGlow }]}
      />

      {/* Where you are, laid over the corner of the map rather than taking a band of screen. */}
      <View testID="zone-badge" pointerEvents="none" style={[styles.badge, compact && styles.badgeCompact]}>
        <Text style={styles.badgeKicker}>
          {stage?.bonus
            ? t("map.stageBadgeBonus")
            : t(stage?.gym ? "map.stageBadgeGym" : "map.stageBadge", { stage: stage?.stage ?? 1, total: TOTAL_STAGES })}
        </Text>
        <Text accessibilityRole="header" style={styles.badgeTitle}>{c.stage(map.zoneId)}</Text>
        {festaHere && <Text style={styles.badgeFesta}>{t("festa.badge")}</Text>}
      </View>

      {toast && (
        <View testID="map-toast" pointerEvents="none" style={[styles.toast, compact && styles.toastCompact]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Hidden side menu: a slim tab on the edge that slides a panel out, so the map's
          controls can't be hit by accident while walking. */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [
              { translateX: drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [DRAWER_WIDTH, 0] }) },
            ],
          },
        ]}
      >
        {[
          { label: t("home.party"), testID: "drawer-party", go: () => navigation.navigate("Party") },
          { label: t("home.bag"), testID: "drawer-bag", go: () => navigation.navigate("Bag") },
          { label: t("home.quests"), testID: "drawer-quests", go: () => navigation.navigate("Quests") },
          { label: t("home.codex"), testID: "drawer-codex", go: () => navigation.navigate("Codex") },
          { label: t("home.shop"), testID: "drawer-shop", go: () => navigation.navigate("Shop") },
          { label: t("home.help"), testID: "drawer-help", go: () => navigation.navigate("Help") },
          { label: t("home.settings"), testID: "drawer-settings", go: () => navigation.navigate("Settings") },
          { label: t("map.menu"), testID: "menu-button", go: () => navigation.navigate("Home") },
        ].map((entry) => (
          <Pressable
            key={entry.label}
            testID={entry.testID}
            onPress={() => {
              ui.tap();
              toggleDrawer(false);
              entry.go();
            }}
            style={({ pressed }) => [styles.drawerItem, pressed && styles.drawerItemPressed]}
          >
            <Text style={styles.drawerItemText}>{entry.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <Pressable
        testID="drawer-tab"
        onPress={() => toggleDrawer(!drawerOpen)}
        style={({ pressed }) => [styles.drawerTab, pressed && styles.drawerTabPressed]}
      >
        <Text style={styles.drawerTabGlyph}>{drawerOpen ? "›" : "‹"}</Text>
      </Pressable>

      {/* Controls float over the world. Black outlines and arrows, nothing filled in behind
          them, so the map stays visible through the control you are using. */}
      <View
        testID="map-controls"
        pointerEvents="box-none"
        style={[styles.controls, compact ? styles.controlsCompact : styles.controlsWide, SIDE_STYLE[controlSide]]}
      >
        <View style={styles.dpad}>
          <DpadButton active={dpadActive} testID="move-up" glyph="▲" onPress={() => move("up")} />
          <View style={styles.dpadMiddleRow}>
            <DpadButton active={dpadActive} testID="move-left" glyph="◀" onPress={() => move("left")} />
            <View style={styles.dpadSpacer} />
            <DpadButton active={dpadActive} testID="move-right" glyph="▶" onPress={() => move("right")} />
          </View>
          <DpadButton active={dpadActive} testID="move-down" glyph="▼" onPress={() => move("down")} />
        </View>
      </View>

    </View>
  );

  return (
    <>
      {compact ? (
        <View style={styles.compactRoot}>{world_}</View>
      ) : (
        <ScreenBackground style={styles.wideRoot}>{world_}</ScreenBackground>
      )}
      {briefing.length > 0 && <BriefingModal pages={briefing} onDone={finishBriefing} />}
      {notice && <BriefingModal pages={notice} onDone={closeNotice} />}
      {learnPrompt && (
        <MoveLearnModal
          prompt={learnPrompt}
          onReplace={(forgetMoveId) => {
            replacePartyMemberMove(learnPrompt.uid, forgetMoveId, learnPrompt.newMoveId);
            setToast(t("quest.signatureLearned", { name: learnPrompt.displayName, move: c.move(learnPrompt.newMoveId) }));
            setLearnPrompt(null);
          }}
          onSkip={() => {
            setToast(t("quest.signatureHint", { move: c.move(learnPrompt.newMoveId) }));
            setLearnPrompt(null);
          }}
        />
      )}
    </>
  );
}

/** Before a held button starts repeating, and how often it repeats — just over one step's
 * walk animation, so holding a direction walks smoothly. */
const HOLD_DELAY_MS = 260;
const HOLD_REPEAT_MS = 170;

/**
 * One arrow of the D-pad. A tap takes one step; holding it keeps walking until you let go.
 * The step fires on press-in, not release, so movement answers the thumb immediately.
 */
function DpadButton({
  testID,
  glyph,
  onPress,
  active,
}: {
  testID: string;
  glyph: string;
  onPress: () => void;
  /** False while a battle, menu or popup has the screen — a held button lets go then. */
  active: boolean;
}) {
  // The map re-renders every step with a fresh move function; a held button must call the latest.
  const latest = useRef(onPress);
  latest.current = onPress;
  const stepped = useRef(false);
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = {};
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (!active) stop();
  }, [active]);
  return (
    <Pressable
      testID={testID}
      onPressIn={() => {
        stop();
        stepped.current = true;
        latest.current();
        timers.current.delay = setTimeout(() => {
          timers.current.repeat = setInterval(() => latest.current(), HOLD_REPEAT_MS);
        }, HOLD_DELAY_MS);
      }}
      onPressOut={stop}
      // A very quick tap on the web can arrive as a press without a press-in; still take the step.
      onPress={() => {
        if (!stepped.current) latest.current();
        stepped.current = false;
      }}
      style={({ pressed }) => [styles.dpadButton, pressed && styles.dpadButtonPressed]}
    >
      <Text style={styles.dpadGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Compact: the map is the screen. The backdrop is the same deep green as the tree line, so
  // if a zone is ever smaller than the screen the edge reads as more forest, not a gap.
  compactRoot: {
    flex: 1,
    backgroundColor: world.treeCanopyDark,
  },
  wideRoot: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewport: {
    position: "relative",
    overflow: "hidden",
  },
  viewportCompact: {},
  viewportWide: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
  },
  /** Anything standing on the map — trainers, the follower, the player — is placed in grid space. */
  entity: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    position: "absolute",
    top: -6,
    color: "#ff5a8a",
    fontSize: 16,
    fontWeight: "900",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },
  healGlow: {
    backgroundColor: "#7ddba0",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Clears the status bar / notch on a phone.
  badgeCompact: {
    top: 44,
  },
  badgeKicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  badgeFesta: {
    color: "#b0356a",
    fontSize: 12,
    fontWeight: "800",
  },
  badgeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  toast: {
    position: "absolute",
    top: 76,
    left: 12,
    right: 12,
    alignItems: "center",
  },
  toastCompact: {
    top: 108,
  },
  toastText: {
    backgroundColor: "rgba(20,28,34,0.82)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    alignItems: "center",
  },
  // Thumb height on a phone, clear of the home indicator.
  controlsCompact: {
    left: 0,
    right: 0,
    bottom: 36,
    paddingHorizontal: 22,
  },
  controlsWide: {
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 18,
  },
  dpad: {
    alignItems: "center",
    gap: 6,
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dpadButton: {
    width: DPAD_BUTTON,
    height: DPAD_BUTTON,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 2.5,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  dpadButtonPressed: {
    backgroundColor: "rgba(0,0,0,0.18)",
    transform: [{ scale: 0.95 }],
  },
  dpadSpacer: {
    width: DPAD_BUTTON,
    height: DPAD_BUTTON,
  },
  dpadGlyph: {
    fontSize: 22,
    color: "#000000",
    // A thin light halo so a black arrow still reads over a dark tree or deep water.
    textShadowColor: "rgba(255,255,255,0.75)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "rgba(251,245,232,0.97)",
    borderLeftWidth: 3,
    borderLeftColor: "#1f4e8c",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
    justifyContent: "center",
  },
  drawerItem: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#fffdf8",
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: "#d6c6a6",
  },
  drawerItemPressed: {
    backgroundColor: colors.accent,
    borderBottomWidth: 1.5,
    transform: [{ scale: 0.95 }],
  },
  drawerItemText: {
    color: "#1f4e8c",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  /** Deliberately small and hard against the edge: easy to find, hard to hit while walking. */
  drawerTab: {
    position: "absolute",
    right: 0,
    top: "42%",
    width: 22,
    height: 54,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTabPressed: {
    backgroundColor: colors.accent,
  },
  drawerTabGlyph: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: "700",
  },
});
