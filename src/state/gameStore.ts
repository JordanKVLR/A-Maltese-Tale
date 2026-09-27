import { moveItem } from "../game/reorder";
import { getDexEntry } from "../game/speciesCatalog";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildStarterParticipant, STARTER_STARTING_LEVEL, type StarterLineName } from "../game/creatureFactory";
import {
  partyMemberFromParticipant,
  partyMemberStats,
  fullPpFor,
  remainingPp,
  addExperience,
  applyLevelUp,
  type PartyMember,
  type EvolutionReveal,
  type MoveLearnResult,
} from "../game/party";
import { defaultStartingInventory, getItem } from "../game/itemsRepo";
import { getMove } from "../game/movesRepo";
import { STAGES, getStage } from "../game/zoneProgression";
import { getQuest, questState, type QuestRecord, type QuestWorld } from "../game/quests";
import { starterSignatureFor } from "../game/creatureFactory";
import type { Treasure } from "../game/mapFeatures";
import { FRIENDSHIP_GAIN, withFriendship } from "../game/friendship";


const SAVE_KEY = "melita-save";
/**
 * 2 added visitedStageIds. A save from before then has no record of where the player has been,
 * so the migration below credits them with every stage up to the one they are standing in —
 * the route is linear, so that is exactly the set they must have walked through.
 */
const SAVE_VERSION = 3;
const STARTING_ZONE_ID = "melita_woods";
const DEFAULT_PLAYER_NAME = "Traveler";
const MAX_PARTY_SIZE = 6;
const STARTING_CURRENCY = 50;

/**
 * Every stage a pre-v2 save must already have passed through. Stages only open in order, so
 * a player standing in stage N walked through 1..N. A save with no party never started.
 */
/**
 * Party members carry their own copy of their base stats. When the starters were rebalanced
 * (save v3), a starter already in someone's party would have kept the old, weaker numbers —
 * so bring every starter up to what its species now has, keeping its HP at the same fraction.
 */
export function refreshStarterStats(party: PartyMember[]): PartyMember[] {
  return party.map((member) => {
    const entry = getDexEntry(member.speciesId);
    if (entry?.category !== "starter" || !entry.stats) return member;
    const oldMax = partyMemberStats(member).hp;
    const updated = { ...member, baseStats: entry.stats };
    const newMax = partyMemberStats(updated).hp;
    const currentHp = member.currentHp <= 0 ? 0 : Math.max(1, Math.round((member.currentHp / oldMax) * newMax));
    return { ...updated, currentHp: Math.min(newMax, currentHp) };
  });
}

export function stagesReachedBy(currentZoneId: string | undefined, partySize: number): string[] {
  if (partySize === 0) return [];
  const current = getStage(currentZoneId ?? STARTING_ZONE_ID)?.stage ?? 1;
  return STAGES.filter((s) => s.stage <= current).map((s) => s.id);
}

export interface ExperienceGainResult {
  member: PartyMember;
  leveledUp: boolean;
  newLevel: number;
  levelsGained: number;
  evolution: EvolutionReveal | null;
  moveLearning: MoveLearnResult;
}

export type UseItemResult =
  | { applied: false }
  | { applied: true; effect: "heal"; healedAmount: number }
  | { applied: true; effect: "revive"; healedAmount: number }
  | { applied: true; effect: "treat"; friendship: number }
  | {
      applied: true;
      effect: "level_up";
      member: PartyMember;
      evolution: EvolutionReveal | null;
      moveLearning: MoveLearnResult;
    };

interface GameState {
  playerName: string;
  selectedLine: StarterLineName | null;
  currentZoneId: string;
  battlesWon: number;
  party: PartyMember[];
  seenSpeciesIds: string[];
  caughtSpeciesIds: string[];
  inventory: Record<string, number>;
  currency: number;
  /** True once the persisted save (if any) has finished loading from disk. Screens that decide
   * whether to offer "Continue" should wait for this before trusting `party.length`. */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  /** Gym medals earned, in the order they were won — these gate the later stages. */
  medals: string[];
  awardMedal: (medalId: string) => void;
  hasMedal: (medalId: string) => boolean;
  /** Trainers already beaten, so they don't re-challenge on every pass. */
  defeatedTrainerIds: string[];
  markTrainerDefeated: (trainerId: string) => void;
  /** Stages the player has already been briefed on. A stage's briefing plays on the first
   * entry only — walking back into it, or back through it after clearing it, says nothing. */
  visitedStageIds: string[];
  markStageVisited: (zoneId: string) => void;

  selectStarter: (line: StarterLineName) => void;
  recordBattleResult: (won: boolean) => void;
  updatePartyMemberHp: (uid: string, currentHp: number) => void;
  markSeen: (speciesId: string) => void;
  /** Adds a caught creature to the party, or to the Gaġġa if the party is full. */
  catchCreature: (member: PartyMember) => "party" | "cage";
  /** The Gaġġa: every creature not travelling with you. Unlimited. */
  cage: PartyMember[];
  /** Party → Gaġġa. Refuses to leave you without a creature that can fight. */
  depositCreature: (uid: string) => boolean;
  /** Gaġġa → party, if there is room. */
  withdrawCreature: (uid: string) => boolean;
  /** Trades a party member for a Gaġġa creature, the new one taking the same slot. */
  swapWithCage: (partyUid: string, cageUid: string) => boolean;
  consumeItem: (itemId: string) => boolean;
  earnCurrency: (amount: number) => void;
  spendCurrency: (amount: number) => boolean;
  addItem: (itemId: string, quantity: number) => void;
  grantExperience: (uid: string, xp: number) => ExperienceGainResult | null;
  setCurrentZone: (zoneId: string) => void;
  setPlayerName: (name: string) => void;
  releaseCreature: (uid: string) => boolean;
  /** Applies a "heal" or "level_up" item to a party member outside of battle (e.g. from Creature Detail). */
  useItemOnPartyMember: (uid: string, itemId: string) => UseItemResult;
  /** Bumps a party member's level by 1 in the store, independent of any live battle context. */
  bumpPartyMemberLevel: (uid: string) => void;
  /** Moves the given party member to the front of the party order, so it leads future battles
   * (the battle screen always picks the first conscious member as the active fighter). */
  setMainPartyMember: (uid: string) => void;
  /** Moves a party member from one slot to another — the Party screen's drag and drop. The
   * first conscious member leads the next battle. */
  reorderParty: (fromIndex: number, toIndex: number) => void;
  /** Renames a party member's displayName (a nickname); ignores blank input. */
  renamePartyMember: (uid: string, name: string) => void;
  /** Healing Center: fully revives every KO'd (currentHp <= 0) party member to max HP.
   * Deliberately leaves already-conscious members untouched, even if not at full HP —
   * this is a blackout-recovery station, not a full-party top-up. Returns how many were healed. */
  /** Healing Centre: restores HP and move PP across the whole party. Returns how many
   * members actually needed it. */
  healFaintedPartyMembers: () => number;
  /** Consumes one PP of a move for a party member. */
  spendPp: (uid: string, moveId: string) => void;
  /** Swaps a known move for a newly learned one, giving the new move full PP. Passing a
   * forgotten move the member doesn't know is a no-op. */
  replacePartyMemberMove: (uid: string, forgetMoveId: string, learnMoveId: string) => void;
  /** Side quests taken, and whether they are finished. */
  quests: Record<string, QuestRecord>;
  /** Every creature ever caught, counted per type — what "catch two Rock types" checks. */
  catchesByType: Record<string, number>;
  /** Glints already picked up: quest objects and treasure. */
  foundIds: string[];
  /** The last day ("YYYY-MM-DD") the festa gift was collected. */
  festaGiftDay: string | null;
  /** Collects today's festa gift; false if it was already collected today. */
  claimFestaGift: (day: string, itemId: string, quantity: number) => boolean;
  acceptQuest: (questId: string) => void;
  /** Nudges friendship up or down for the given party members. */
  adjustFriendship: (uids: readonly string[], delta: number) => void;
  /** Picks up a glint. Treasure goes straight into the bag or purse. */
  collectFind: (findId: string, treasure?: Treasure) => void;
  /** Hands a finished quest in: marks it done and pays out. Returns false if it isn't ready. */
  completeQuest: (questId: string) => boolean;
  /** Teaches a starter-line creature its signature move if it has a free slot. Returns the
   * member when a move has to be forgotten first, "learned" when it went in, or null. */
  teachSignature: () => { status: "learned"; uid: string } | { status: "full"; member: PartyMember; moveId: string } | null;
  /** Adds a move into a free slot (the Move Tutor). False if all four slots are taken. */
  learnMove: (uid: string, moveId: string) => boolean;
  /** One-time explanations the player has already been shown (e.g. "crux"). */
  tutorialsSeen: string[];
  markTutorial: (id: string) => void;
  resetGame: () => void;
}

/** A creature put in the Gaġġa rests there: full HP, every move recharged. */
function restored(member: PartyMember): PartyMember {
  return { ...member, currentHp: partyMemberStats(member).hp, movePp: fullPpFor(member.moveIds) };
}

/** Evolving into a species counts as owning it, for the Codex and collector medals. */
function withOwned(ids: string[], speciesId: string): string[] {
  return ids.includes(speciesId) ? ids : [...ids, speciesId];
}

/** The slice of the save the quest rules read. */
export function questWorldOf(state: Pick<GameState, keyof QuestWorld>): QuestWorld {
  return {
    quests: state.quests,
    catchesByType: state.catchesByType,
    defeatedTrainerIds: state.defeatedTrainerIds,
    foundIds: state.foundIds,
    party: state.party,
    medals: state.medals,
    visitedStageIds: state.visitedStageIds,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
    playerName: DEFAULT_PLAYER_NAME,
    selectedLine: null,
    currentZoneId: STARTING_ZONE_ID,
    battlesWon: 0,
    party: [],
    seenSpeciesIds: [],
    caughtSpeciesIds: [],
    inventory: defaultStartingInventory(),
    currency: STARTING_CURRENCY,
    hasHydrated: false,
    setHasHydrated: (value) => set({ hasHydrated: value }),
    medals: [],
    awardMedal: (medalId) =>
      set((state) =>
        state.medals.includes(medalId) ? state : { medals: [...state.medals, medalId] }
      ),
    hasMedal: (medalId) => get().medals.includes(medalId),
    defeatedTrainerIds: [],
    quests: {},
    catchesByType: {},
    foundIds: [],
    festaGiftDay: null,
    claimFestaGift: (day, itemId, quantity) => {
      const state = get();
      if (state.festaGiftDay === day) return false;
      set({ festaGiftDay: day, inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + quantity } });
      return true;
    },
    adjustFriendship: (uids, delta) =>
      set((state) => ({ party: state.party.map((m) => (uids.includes(m.uid) ? withFriendship(m, delta) : m)) })),
    acceptQuest: (questId) =>
      set((state) =>
        state.quests[questId]
          ? state
          : { quests: { ...state.quests, [questId]: { status: "active", catchBaseline: { ...state.catchesByType } } } }
      ),
    collectFind: (findId, treasure) =>
      set((state) => {
        if (state.foundIds.includes(findId)) return state;
        const next: Partial<GameState> = { foundIds: [...state.foundIds, findId] };
        if (treasure?.itemId) {
          next.inventory = { ...state.inventory, [treasure.itemId]: (state.inventory[treasure.itemId] ?? 0) + (treasure.quantity ?? 1) };
        }
        if (treasure?.gold) next.currency = state.currency + treasure.gold;
        return next;
      }),
    completeQuest: (questId) => {
      const quest = getQuest(questId);
      const state = get();
      if (!quest || questState(quest, questWorldOf(state)) !== "ready") return false;
      set({
        quests: { ...state.quests, [questId]: { ...state.quests[questId], status: "done" } },
        inventory: { ...state.inventory, [quest.reward.keyItemId]: 1 },
        currency: state.currency + quest.reward.gold,
      });
      return true;
    },
    teachSignature: () => {
      const { party } = get();
      const member = party.find((m) => m.sourceCategory === "starter" && starterSignatureFor(m.speciesId));
      if (!member) return null;
      const moveId = starterSignatureFor(member.speciesId)!;
      if (member.moveIds.includes(moveId)) return null;
      if (member.moveIds.length >= 4) return { status: "full", member, moveId };
      set({
        party: party.map((m) =>
          m.uid === member.uid
            ? { ...m, moveIds: [...m.moveIds, moveId], movePp: { ...(m.movePp ?? fullPpFor(m.moveIds)), [moveId]: getMove(moveId).pp } }
            : m
        ),
      });
      return { status: "learned", uid: member.uid };
    },
    learnMove: (uid, moveId) => {
      const member = get().party.find((m) => m.uid === uid);
      if (!member || member.moveIds.length >= 4 || member.moveIds.includes(moveId)) return false;
      set((state) => ({
        party: state.party.map((m) =>
          m.uid === uid
            ? { ...m, moveIds: [...m.moveIds, moveId], movePp: { ...(m.movePp ?? fullPpFor(m.moveIds)), [moveId]: getMove(moveId).pp } }
            : m
        ),
      }));
      return true;
    },
    tutorialsSeen: [],
    markTutorial: (id) =>
      set((state) => (state.tutorialsSeen.includes(id) ? state : { tutorialsSeen: [...state.tutorialsSeen, id] })),
    markTrainerDefeated: (trainerId) =>
      set((state) =>
        state.defeatedTrainerIds.includes(trainerId)
          ? state
          : { defeatedTrainerIds: [...state.defeatedTrainerIds, trainerId] }
      ),
    visitedStageIds: [],
    markStageVisited: (zoneId) =>
      set((state) =>
        state.visitedStageIds.includes(zoneId) ? state : { visitedStageIds: [...state.visitedStageIds, zoneId] }
      ),

    selectStarter: (line) => {
      const participant = buildStarterParticipant(line, STARTER_STARTING_LEVEL, "player-1");
      const member = partyMemberFromParticipant(participant, "starter");
      set({
        selectedLine: line,
        party: [member],
        seenSpeciesIds: [member.speciesId],
        caughtSpeciesIds: [member.speciesId],
      });
    },

    recordBattleResult: (won) =>
      set((state) => ({ battlesWon: won ? state.battlesWon + 1 : state.battlesWon })),

    updatePartyMemberHp: (uid, currentHp) =>
      set((state) => ({
        party: state.party.map((m) => (m.uid === uid ? { ...m, currentHp: Math.max(0, currentHp) } : m)),
      })),

    markSeen: (speciesId) =>
      set((state) =>
        state.seenSpeciesIds.includes(speciesId)
          ? state
          : { seenSpeciesIds: [...state.seenSpeciesIds, speciesId] }
      ),

    cage: [],
    depositCreature: (uid) => {
      const { party, cage } = get();
      const member = party.find((m) => m.uid === uid);
      if (!member) return false;
      const rest = party.filter((m) => m.uid !== uid);
      if (!rest.some((m) => m.currentHp > 0)) return false;
      set({ party: rest, cage: [...cage, restored(member)] });
      return true;
    },
    withdrawCreature: (uid) => {
      const { party, cage } = get();
      const member = cage.find((m) => m.uid === uid);
      if (!member || party.length >= MAX_PARTY_SIZE) return false;
      set({ party: [...party, member], cage: cage.filter((m) => m.uid !== uid) });
      return true;
    },
    swapWithCage: (partyUid, cageUid) => {
      const { party, cage } = get();
      const leaving = party.find((m) => m.uid === partyUid);
      const joining = cage.find((m) => m.uid === cageUid);
      if (!leaving || !joining) return false;
      set({
        party: party.map((m) => (m.uid === partyUid ? joining : m)),
        cage: [...cage.filter((m) => m.uid !== cageUid), restored(leaving)],
      });
      return true;
    },
    catchCreature: (member) => {
      const { party, caughtSpeciesIds } = get();
      const catchesByType = { ...get().catchesByType };
      for (const type of member.types) catchesByType[type] = (catchesByType[type] ?? 0) + 1;
      const full = party.length >= MAX_PARTY_SIZE;
      set({
        catchesByType,
        ...(full ? { cage: [...get().cage, restored(member)] } : { party: [...party, member] }),
        caughtSpeciesIds: caughtSpeciesIds.includes(member.speciesId)
          ? caughtSpeciesIds
          : [...caughtSpeciesIds, member.speciesId],
      });
      return full ? "cage" : "party";
    },

    consumeItem: (itemId) => {
      const qty = get().inventory[itemId] ?? 0;
      if (qty <= 0) return false;
      set((state) => ({ inventory: { ...state.inventory, [itemId]: qty - 1 } }));
      return true;
    },

    earnCurrency: (amount) => set((state) => ({ currency: state.currency + Math.max(0, amount) })),

    spendCurrency: (amount) => {
      const { currency } = get();
      if (amount <= 0 || currency < amount) return false;
      set({ currency: currency - amount });
      return true;
    },

    addItem: (itemId, quantity) =>
      set((state) => ({
        inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + quantity },
      })),

    grantExperience: (uid, xp) => {
      const member = get().party.find((m) => m.uid === uid);
      if (!member) return null;
      const result = addExperience(member, xp);
      const grown = result.leveledUp ? withFriendship(result.member, FRIENDSHIP_GAIN.levelUp * result.levelsGained) : result.member;
      set((state) => ({
        party: state.party.map((m) => (m.uid === uid ? grown : m)),
        caughtSpeciesIds: withOwned(state.caughtSpeciesIds, grown.speciesId),
      }));
      result.member = grown;
      return result;
    },

    setCurrentZone: (zoneId) => set({ currentZoneId: zoneId }),

    setPlayerName: (name) => set({ playerName: name.trim().length > 0 ? name.trim() : DEFAULT_PLAYER_NAME }),

    releaseCreature: (uid) => {
      const { party } = get();
      if (party.length <= 1) return false;
      const exists = party.some((m) => m.uid === uid);
      if (!exists) return false;
      set({ party: party.filter((m) => m.uid !== uid) });
      return true;
    },

    useItemOnPartyMember: (uid, itemId) => {
      const { party, inventory } = get();
      const member = party.find((m) => m.uid === uid);
      if (!member) return { applied: false };
      const qty = inventory[itemId] ?? 0;
      if (qty <= 0) return { applied: false };
      const item = getItem(itemId);

      if (item.effect === "heal" && item.healAmount !== undefined) {
        const maxHp = partyMemberStats(member).hp;
        const newHp = Math.min(maxHp, member.currentHp + item.healAmount);
        const healedAmount = newHp - member.currentHp;
        set({
          party: party.map((m) => (m.uid === uid ? withFriendship({ ...m, currentHp: newHp }, FRIENDSHIP_GAIN.cared) : m)),
          inventory: { ...inventory, [itemId]: qty - 1 },
        });
        return { applied: true, effect: "heal", healedAmount };
      }

      if (item.effect === "revive") {
        if (member.currentHp > 0) return { applied: false };
        const newHp = Math.max(1, Math.floor(partyMemberStats(member).hp / 2));
        set({
          party: party.map((m) => (m.uid === uid ? withFriendship({ ...m, currentHp: newHp }, FRIENDSHIP_GAIN.cared) : m)),
          inventory: { ...inventory, [itemId]: qty - 1 },
        });
        return { applied: true, effect: "revive", healedAmount: newHp };
      }

      if (item.effect === "treat") {
        const fed = withFriendship(member, item.friendshipAmount ?? 20);
        set({
          party: party.map((m) => (m.uid === uid ? fed : m)),
          inventory: { ...inventory, [itemId]: qty - 1 },
        });
        return { applied: true, effect: "treat", friendship: fed.friendship ?? 0 };
      }

      if (item.effect === "level_up") {
        const { member: leveled, evolution, moveLearning } = applyLevelUp(member);
        set({
          party: party.map((m) => (m.uid === uid ? withFriendship(leveled, FRIENDSHIP_GAIN.cared) : m)),
          caughtSpeciesIds: withOwned(get().caughtSpeciesIds, leveled.speciesId),
          inventory: { ...inventory, [itemId]: qty - 1 },
        });
        return { applied: true, effect: "level_up", member: leveled, evolution, moveLearning };
      }

      return { applied: false };
    },

    bumpPartyMemberLevel: (uid) => {
      const member = get().party.find((m) => m.uid === uid);
      if (!member) return;
      const { member: leveled } = applyLevelUp(member);
      set((state) => ({
        party: state.party.map((m) => (m.uid === uid ? leveled : m)),
        caughtSpeciesIds: withOwned(state.caughtSpeciesIds, leveled.speciesId),
      }));
    },

    setMainPartyMember: (uid) => {
      const { party } = get();
      const index = party.findIndex((m) => m.uid === uid);
      if (index <= 0) return; // already main, or not found
      const reordered = [party[index], ...party.slice(0, index), ...party.slice(index + 1)];
      set({ party: reordered });
    },

    reorderParty: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      set((state) => ({ party: moveItem(state.party, fromIndex, toIndex) }));
    },

    renamePartyMember: (uid, name) => {
      const trimmed = name.trim().slice(0, 16);
      if (!trimmed) return;
      set((state) => ({
        party: state.party.map((m) => (m.uid === uid ? { ...m, displayName: trimmed } : m)),
      }));
    },

    healFaintedPartyMembers: () => {
      const { party } = get();
      let restoredCount = 0;
      const healed = party.map((m) => {
        const maxHp = partyMemberStats(m).hp;
        const needsHp = m.currentHp < maxHp;
        const needsPp = m.moveIds.some((id) => remainingPp(m, id) < getMove(id).pp);
        if (!needsHp && !needsPp) return m;
        restoredCount += 1;
        return withFriendship({ ...m, currentHp: maxHp, movePp: fullPpFor(m.moveIds) }, FRIENDSHIP_GAIN.rested);
      });
      if (restoredCount > 0) set({ party: healed });
      return restoredCount;
    },

    replacePartyMemberMove: (uid, forgetMoveId, learnMoveId) =>
      set((state) => ({
        party: state.party.map((m) => {
          if (m.uid !== uid || !m.moveIds.includes(forgetMoveId)) return m;
          const moveIds = m.moveIds.map((id) => (id === forgetMoveId ? learnMoveId : id));
          const movePp = { ...(m.movePp ?? {}) };
          delete movePp[forgetMoveId];
          movePp[learnMoveId] = getMove(learnMoveId).pp;
          return { ...m, moveIds, movePp };
        }),
      })),

    spendPp: (uid, moveId) =>
      set((state) => ({
        party: state.party.map((m) => {
          if (m.uid !== uid) return m;
          const current = remainingPp(m, moveId);
          return { ...m, movePp: { ...(m.movePp ?? fullPpFor(m.moveIds)), [moveId]: Math.max(0, current - 1) } };
        }),
      })),

    resetGame: () =>
      set({
        medals: [],
        defeatedTrainerIds: [],
        quests: {},
        cage: [],
        catchesByType: {},
        foundIds: [],
        festaGiftDay: null,
        tutorialsSeen: [],
        visitedStageIds: [],
        playerName: DEFAULT_PLAYER_NAME,
        selectedLine: null,
        currentZoneId: STARTING_ZONE_ID,
        battlesWon: 0,
        party: [],
        seenSpeciesIds: [],
        caughtSpeciesIds: [],
        inventory: defaultStartingInventory(),
        currency: STARTING_CURRENCY,
      }),
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist actual save data — never the derived hasHydrated flag (zustand's
      // `set`/`get`-bound action functions can't survive JSON serialization anyway, so those
      // are dropped automatically, but hasHydrated needs an explicit exclusion).
      partialize: (state) => ({
        medals: state.medals,
        defeatedTrainerIds: state.defeatedTrainerIds,
        tutorialsSeen: state.tutorialsSeen,
        quests: state.quests,
        cage: state.cage,
        catchesByType: state.catchesByType,
        foundIds: state.foundIds,
        festaGiftDay: state.festaGiftDay,
        visitedStageIds: state.visitedStageIds,
        playerName: state.playerName,
        selectedLine: state.selectedLine,
        currentZoneId: state.currentZoneId,
        battlesWon: state.battlesWon,
        party: state.party,
        seenSpeciesIds: state.seenSpeciesIds,
        caughtSpeciesIds: state.caughtSpeciesIds,
        inventory: state.inventory,
        currency: state.currency,
      }),
      migrate: (persisted, fromVersion) => {
        const save = (persisted ?? {}) as { currentZoneId?: string; party?: unknown[]; visitedStageIds?: string[] };
        if (fromVersion < 2) save.visitedStageIds = stagesReachedBy(save.currentZoneId, save.party?.length ?? 0);
        if (fromVersion < 3 && Array.isArray(save.party)) save.party = refreshStarterStats(save.party as PartyMember[]);
        return save as unknown as GameState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
