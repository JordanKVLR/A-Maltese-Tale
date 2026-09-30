import type { StarterLineName } from "./creatureFactory";
import { STORY_BATTLES, getStoryBattle, CHARACTERS } from "./story";
import { TRAINER_REWARD_MULTIPLIER, type Trainer } from "./trainers";
import type { TypeName } from "../data/schemas";
import wildCreaturesData from "../data/wildCreatures.json";
import startersData from "../data/starters.json";
import legendariesData from "../data/legendaries.json";

/** How each story character is introduced in battle: a short title and a name. */
const BATTLE_NAMES: Record<string, { title: string; name: string }> = {
  luca: { title: "Rival", name: "Luca" },
  carmela: { title: "Captain", name: "Carmela" },
  lantern: { title: "Black Lantern", name: "Hand" },
  baron: { title: "Baron", name: "Montalto" },
};

const typesOf = new Map<string, TypeName[]>([
  ...wildCreaturesData.wildCreatures.map((c) => [c.id, c.types as TypeName[]] as const),
  ...startersData.starters.flatMap((line) => line.stages.map((s) => [s.id, s.types as TypeName[]] as const)),
  ...legendariesData.legendaries.map((c) => [c.id, c.types as TypeName[]] as const),
]);

/** A story fight as a Trainer the battle screen already knows how to run. */
export function storyTrainer(id: string, playerLine: StarterLineName | null): Trainer | undefined {
  const battle = getStoryBattle(id);
  if (!battle) return undefined;
  const party = battle.party(playerLine ?? "Grass");
  const ace = party[party.length - 1];
  const names = BATTLE_NAMES[battle.who] ?? { title: "", name: CHARACTERS[battle.who].name.en };
  return {
    id: battle.id,
    name: names.name,
    title: names.title,
    zoneId: battle.zoneId,
    position: { row: 0, col: 0 },
    party,
    isGymLeader: false,
    boasts: [],
    rewardMultiplier: battle.finale ? 5 : TRAINER_REWARD_MULTIPLIER + 0.5,
    signatureType: typesOf.get(ace.speciesId)?.[0] ?? "Normal",
    story: true,
    // The Baron fights like a Keeper: he uses his Crux.
    usesCrux: battle.finale,
  };
}

export const STORY_TRAINER_IDS = STORY_BATTLES.map((b) => b.id);
