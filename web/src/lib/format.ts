/**
 * Pure display helpers. No network, no server imports.
 */

import type { Character } from "../../../server/types/character";

/** The API returns [] as often as null. Treat both as "nothing recorded". */
export const firstOf = (list: string[] | null): string | null =>
  list && list.length > 0 ? list[0] : null;

export const hasAny = (list: string[] | null): list is string[] =>
  Boolean(list && list.length > 0);

/**
 * Up to two initials for the fallback plate. Handles "Mr. Arlert" and
 * "11th Commander" alike — whatever the record is called, it gets a mark.
 */
export const initials = (name: string): string => {
  const marks = name
    .split(/[\s-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());

  return marks.join("") || "?";
};

/**
 * The scrape captured Fandom's `/revision/latest?cb=…` suffix, which the CDN
 * no longer serves — every such URL answers 404. The bare file URL still
 * resolves, so normalise it at the point of display.
 */
export const portraitSrc = (url: string | null): string | null =>
  url === null ? null : url.replace(/\/revision\/.*$/, "");

/**
 * Fandom answers a genuinely missing file with a decodable 300×171 "no image"
 * graphic *and* a 404 status. The browser therefore fires `load`, not `error`,
 * and an <img> cannot see the status code — the intrinsic size is the only
 * signal available. Anything matching it is treated as a miss.
 */
const NOT_FOUND_WIDTH = 300;
const NOT_FOUND_HEIGHT = 171;

export const isNotFoundGraphic = (image: HTMLImageElement): boolean =>
  image.naturalWidth === NOT_FOUND_WIDTH &&
  image.naturalHeight === NOT_FOUND_HEIGHT;

export interface Credit {
  actor: string;
  language: string | null;
}

/**
 * `voiceActorJp` holds every credit in one newline-joined string:
 *   "Yuki Kaji (Japanese)\nBryce Papenbrook (English)"
 * Split it back into rows so the record reads as a list, not a paragraph.
 */
export const splitCredits = (raw: string | null): Credit[] => {
  if (!raw) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(line);
      return match
        ? { actor: match[1], language: match[2] }
        : { actor: line, language: null };
    });
};

/**
 * The affiliation shown on a card. Current outranks former, and former is
 * flagged so the card never implies an active posting.
 */
export const cardAffiliation = (
  character: Character,
): { name: string; former: boolean } | null => {
  const current = firstOf(character.affiliations);
  if (current) return { name: current, former: false };

  const former = firstOf(character.formerAffiliations);
  return former ? { name: former, former: true } : null;
};

/**
 * The ruler is measured from the floor, not from the shortest record. A
 * truncated axis would exaggerate the differences; recorded heights only span
 * 135–198cm and the comparison should say so honestly.
 */
export const RULER_MAX_CM = 200;
export const RULER_STEP_CM = 20;
/** Median of the 112 recorded heights. */
export const RULER_MEDIAN_CM = 173;

/** Where a height sits on the ruler, 0 at the floor and 1 at the ceiling. */
export const rulerFraction = (cm: number): number =>
  Math.min(cm / RULER_MAX_CM, 1);

/** Gridline values from the floor to the top of the ruler. */
export const rulerTicks = (): number[] => {
  const ticks: number[] = [];
  for (let cm = 0; cm <= RULER_MAX_CM; cm += RULER_STEP_CM) ticks.push(cm);
  return ticks;
};
