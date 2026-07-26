/**
 * Turning a server verdict into something readable.
 *
 * Every tile carries its verdict in words. Colour repeats that information,
 * it never carries it alone.
 */

import type { Character } from "../../../server/types/character";
import type { GuessResult, Match } from "../../../server/types/game";

/**
 * `unrecorded` is not one of the server's verdicts. It is a miss the player
 * could not have avoided — the archive simply holds nothing on that field —
 * and it reads differently from a guess that was wrong.
 */
export type TileState = "exact" | "partial" | "none" | "unrecorded";

export interface Tile {
  key: string;
  label: string;
  /** The guessed character's own value. */
  value: string;
  state: TileState;
  /** The verdict, spelled out. */
  note: string;
  /** Which way the answer lies, for height only. */
  arrow?: "up" | "down";
  /** Heights are measured facts and set in the mono face. */
  numeric?: boolean;
}

const NOTE: Record<TileState, string> = {
  exact: "Match",
  partial: "Partial",
  none: "Miss",
  unrecorded: "No record",
};

const postings = (character: Character): string[] => [
  ...(character.affiliations ?? []),
  ...(character.formerAffiliations ?? []),
];

/**
 * One posting stands for the record, with a count of the rest. Former postings
 * are flagged so a tile never implies an active one.
 */
const affiliationValue = (character: Character): string => {
  const current = character.affiliations ?? [];
  const held = [...new Set(postings(character))];
  if (held.length === 0) return "None on record";

  const lead = current[0] ?? `Fmr. ${held[0]}`;
  return held.length > 1 ? `${lead} +${held.length - 1}` : lead;
};

const affiliationTile = (result: GuessResult): Tile => {
  const empty = postings(result.character).length === 0;
  const state: TileState = empty ? "unrecorded" : result.affiliations;

  return {
    key: "affiliations",
    label: "Affiliation",
    value: affiliationValue(result.character),
    state,
    note: NOTE[state],
  };
};

const heightTile = (result: GuessResult): Tile => {
  const { heightCm } = result.character;
  const value = heightCm === null ? "None on record" : `${heightCm} cm`;

  if (result.heightCm === "unknown") {
    return {
      key: "heightCm",
      label: "Height",
      value,
      state: "unrecorded",
      // Either side can be the gap, and the player cannot tell which.
      note: "No comparison",
      numeric: heightCm !== null,
    };
  }

  if (result.heightCm === "exact") {
    return {
      key: "heightCm",
      label: "Height",
      value,
      state: "exact",
      note: NOTE.exact,
      numeric: true,
    };
  }

  const taller = result.heightCm === "higher";
  return {
    key: "heightCm",
    label: "Height",
    value,
    state: "none",
    note: taller ? "Answer taller" : "Answer shorter",
    arrow: taller ? "up" : "down",
    numeric: true,
  };
};

const plain = (
  key: string,
  label: string,
  value: string | null,
  match: Match,
): Tile => {
  const state: TileState = value === null ? "unrecorded" : match;
  return {
    key,
    label,
    value: value ?? "None on record",
    state,
    note: NOTE[state],
  };
};

export const guessTiles = (result: GuessResult): Tile[] => [
  plain("status", "Status", result.character.status, result.status),
  plain("gender", "Gender", result.character.gender, result.gender),
  plain(
    "isTitanShifter",
    "Titan power",
    result.character.isTitanShifter ? "Shifter" : "None",
    result.isTitanShifter,
  ),
  affiliationTile(result),
  heightTile(result),
];

/**
 * Autocomplete over the roster. Aliases are matched as well as names — only 33
 * records carry any, but "Armored Titan" ought to find Reiner.
 */
export const searchRoster = (
  characters: Character[],
  query: string,
  limit: number,
): Character[] => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return characters.slice(0, limit);

  const scored: { character: Character; score: number }[] = [];

  for (const character of characters) {
    const name = character.name.toLowerCase();
    const score = name.startsWith(needle)
      ? 0
      : name.includes(needle)
        ? 1
        : (character.aliases ?? []).some((alias) =>
              alias.toLowerCase().includes(needle),
            )
          ? 2
          : -1;

    if (score >= 0) scored.push({ character, score });
  }

  return scored
    .sort(
      (a, b) =>
        a.score - b.score || a.character.name.localeCompare(b.character.name),
    )
    .slice(0, limit)
    .map((entry) => entry.character);
};
