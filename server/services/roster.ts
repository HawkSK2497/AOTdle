/**
 * The list-shaped character projection, in one place.
 *
 * Both the archive endpoint and the drill hand back the same `Character`, so
 * the column list lives here rather than being written out twice and drifting.
 */

import { asc, inArray } from "drizzle-orm";
import { db } from "../db";
import { characters } from "../db/schema";
import type { Character } from "../types/character";

/**
 * Explicit, not `select()`: rawInfobox is large and no client needs it.
 */
export const listColumns = {
  id: characters.id,
  name: characters.name,
  aliases: characters.aliases,
  imageUrl: characters.imageUrl,
  status: characters.status,
  species: characters.species,
  gender: characters.gender,
  heightCm: characters.heightCm,
  affiliations: characters.affiliations,
  formerAffiliations: characters.formerAffiliations,
  occupation: characters.occupation,
  isTitanShifter: characters.isTitanShifter,
  titanForms: characters.titanForms,
  debutEpisode: characters.debutEpisode,
  voiceActorJp: characters.voiceActorJp,
};

/**
 * `is_titan_shifter` is defaulted rather than NOT NULL, so Drizzle types it
 * nullable. The rest of the app treats it as the boolean it always is.
 */
type Row = Omit<Character, "isTitanShifter"> & { isTitanShifter: boolean | null };

const toCharacter = (row: Row): Character => ({
  ...row,
  isTitanShifter: row.isTitanShifter ?? false,
});

export const listCharacters = async (): Promise<Character[]> => {
  const rows = await db
    .select(listColumns)
    .from(characters)
    .orderBy(asc(characters.name));

  return rows.map(toCharacter);
};

/** Every id in the table — the drill's answer pool, never a curated list. */
export const listCharacterIds = async (): Promise<number[]> => {
  const rows = await db.select({ id: characters.id }).from(characters);
  return rows.map((row) => row.id);
};

/** Looked up by id and returned as a map, since callers always want it that way. */
export const findCharacters = async (
  ids: number[],
): Promise<Map<number, Character>> => {
  if (ids.length === 0) return new Map();

  const rows = await db
    .select(listColumns)
    .from(characters)
    .where(inArray(characters.id, [...new Set(ids)]));

  return new Map(rows.map((row) => [row.id, toCharacter(row)]));
};
