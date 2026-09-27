import { STAGES } from "./zoneProgression";

/**
 * The festa: every summer weekend some Maltese village celebrates its patron saint with
 * brass bands, flags and fireworks. In the game, every day one stage holds its festa. It
 * changes at midnight, the same for everyone — and on the real feast days the real feast is
 * held where it belongs.
 *
 * While a stage holds its festa, rarer creatures come out (the crowds stir them up), trainers
 * there pay more, the sky fills with fireworks, and the first visit of the day earns a gift.
 */

export const FEASTS = [
  "st_paul",
  "santa_marija",
  "st_george",
  "st_gregory",
  "st_philip",
  "st_catherine",
  "st_joseph",
  "st_lawrence",
  "il_vittorja",
  "l_imnarja",
] as const;
export type FeastId = (typeof FEASTS)[number];

/** Real feast days, month-day → the feast and where it is held. */
const FIXED_FEASTS: Record<string, { feastId: FeastId; zoneId: string }> = {
  "02-10": { feastId: "st_paul", zoneId: "grand_harbour" },
  "03-19": { feastId: "st_joseph", zoneId: "salina_saltpans" },
  "06-29": { feastId: "l_imnarja", zoneId: "dingli_cliffs" },
  "08-10": { feastId: "st_lawrence", zoneId: "fort_st_angelo" },
  "08-15": { feastId: "santa_marija", zoneId: "ggantija_terrace" },
  "09-08": { feastId: "il_vittorja", zoneId: "fort_st_angelo" },
};

/** Regional variants and legendaries turn up this many times as often during a festa. */
export const FESTA_RARE_MULTIPLIER = 4;
/** Trainers at the festa pay this much more. */
export const FESTA_GOLD_MULTIPLIER = 1.5;
/** The first visit of the day to the festa. */
export const FESTA_GIFT = { itemId: "festa_trap", quantity: 2 } as const;

export interface Festa {
  /** Local calendar day, "YYYY-MM-DD" — also what the once-a-day gift is keyed on. */
  day: string;
  feastId: FeastId;
  zoneId: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function festaOn(date: Date = new Date()): Festa {
  const day = dayKey(date);
  const fixed = FIXED_FEASTS[day.slice(5)];
  if (fixed) return { day, ...fixed };
  const h = hash(`festa:${day}`);
  return { day, feastId: FEASTS[(h >>> 8) % FEASTS.length], zoneId: STAGES[h % STAGES.length].id };
}

export function isFestaZone(zoneId: string, date: Date = new Date()): boolean {
  return festaOn(date).zoneId === zoneId;
}
