import type { I18n, StringKey } from "../i18n/core";
import type { QuestDef, StepProgress } from "./quests";

/** A quest step as a line of text in the player's language, with a count where it helps. */
export function stepLabel(progress: StepProgress, { t, c }: I18n): string {
  const { step, current, target } = progress;
  const count = target > 1 ? ` (${current}/${target})` : "";
  switch (step.kind) {
    case "catch":
      return (step.count === 1
        ? t("quest.step.catch", { type: c.type(step.type) })
        : t("quest.step.catchMany", { count: step.count, type: c.type(step.type) })) + count;
    case "trainers":
      return t("quest.step.trainers", { zones: step.zoneIds.map((z) => c.stage(z)).join(" & ") }) + count;
    case "find":
      return t("quest.step.find", { thing: findName(step.findId, { t, c } as I18n), zone: c.stage(step.zoneId) });
    case "starterLevel":
      return t("quest.step.starterLevel", { level: step.level }) + count;
  }
}

export function findName(findId: string, { t }: Pick<I18n, "t">): string {
  return t(`quest.find.${findId}` as StringKey);
}

export const questTitle = (quest: QuestDef, { t }: Pick<I18n, "t">) => t(`quest.${quest.id}.title` as StringKey);
export const questGiver = (quest: QuestDef, { t }: Pick<I18n, "t">) => t(`quest.${quest.id}.giver` as StringKey);
export const questLine = (quest: QuestDef, part: "offer1" | "offer2" | "thanks", { t }: Pick<I18n, "t">) =>
  t(`quest.${quest.id}.${part}` as StringKey);
