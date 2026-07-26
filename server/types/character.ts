/**
 * Shared between the API and the frontend.
 * TYPES ONLY - no runtime exports, no Drizzle imports.
 * Must stay in sync with server/db/schema.ts.
 */

export type CharacterStatus = "Alive" | "Deceased" | "Unknown";

/** Shape returned by GET /api/characters */
export interface Character {
  id: number;
  name: string;
  imageUrl: string | null;
  status: CharacterStatus | null;
  species: string[] | null;
  gender: string | null;
  heightCm: number | null;
  affiliations: string[] | null;
  formerAffiliations: string[] | null;
  occupation: string | null;
  isTitanShifter: boolean;
  titanForms: string[] | null;
  debutEpisode: string | null;
  voiceActorJp: string | null;
}

/** Shape returned by GET /api/characters/:id */
export interface CharacterDetail extends Character {
  wikiTitle: string;
  kanji: string | null;
  romaji: string | null;
  aliases: string[] | null;
  weightKg: number | null;
  birthday: string | null;
  birthplace: string | null;
  residence: string | null;
  rank: string | null;
  formerRank: string | null;
  gradRank: number | null;
  titanKillsTotal: number | null;
  debutChapter: string | null;
  formerOccupation: string | null;
  voiceActorEn: string | null;
  isInAnime: boolean;
}
