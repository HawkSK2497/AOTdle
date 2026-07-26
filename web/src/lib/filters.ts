/**
 * Search, filtering and ordering. All of it runs in memory over the 189
 * records the API hands back once.
 */

import type {
  Character,
  CharacterStatus,
} from "../../../server/types/character";

export type SortKey = "depth" | "name";

export interface Filters {
  query: string;
  statuses: CharacterStatus[];
  shifterOnly: boolean;
  affiliations: string[];
}

export const EMPTY_FILTERS: Filters = {
  query: "",
  statuses: [],
  shifterOnly: false,
  affiliations: [],
};

export const STATUS_ORDER: CharacterStatus[] = ["Alive", "Deceased", "Unknown"];

export interface Facet<T> {
  value: T;
  count: number;
}

/** Current and former postings together — a filter that excluded Eren from
 *  "Survey Corps" because he left would be lying about the record. */
const postings = (character: Character): string[] => [
  ...(character.affiliations ?? []),
  ...(character.formerAffiliations ?? []),
];

/**
 * Affiliation facets derived from the response, never a hardcoded list.
 * Ordered by size so the 40-strong Survey Corps sits above the units with a
 * single recorded member, without hiding the long tail.
 */
export const deriveAffiliations = (
  characters: Character[],
): Facet<string>[] => {
  const counts = new Map<string, number>();

  for (const character of characters) {
    for (const posting of new Set(postings(character))) {
      counts.set(posting, (counts.get(posting) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

export const deriveStatuses = (
  characters: Character[],
): Facet<CharacterStatus>[] =>
  STATUS_ORDER.map((value) => ({
    value,
    count: characters.filter((c) => c.status === value).length,
  })).filter((facet) => facet.count > 0);

export const countShifters = (characters: Character[]): number =>
  characters.filter((c) => c.isTitanShifter).length;

const matchesQuery = (character: Character, query: string): boolean => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const name = character.name.toLowerCase();
  return tokens.every((token) => name.includes(token));
};

export const applyFilters = (
  characters: Character[],
  filters: Filters,
): Character[] =>
  characters.filter((character) => {
    if (!matchesQuery(character, filters.query)) return false;
    if (filters.shifterOnly && !character.isTitanShifter) return false;

    if (
      filters.statuses.length > 0 &&
      (character.status === null ||
        !filters.statuses.includes(character.status))
    ) {
      return false;
    }

    if (filters.affiliations.length > 0) {
      const held = postings(character);
      if (!filters.affiliations.some((name) => held.includes(name))) {
        return false;
      }
    }

    return true;
  });

export const activeFilterCount = (filters: Filters): number =>
  filters.statuses.length +
  filters.affiliations.length +
  (filters.shifterOnly ? 1 : 0) +
  (filters.query.trim() ? 1 : 0);

/**
 * How much of a record survived the scrape. The archive kept far more on the
 * people it cared about, so this is a truthful proxy for prominence — and it
 * keeps `11th Commander` from sitting alphabetically above everyone.
 */
export const recordDepth = (character: Character): number => {
  const filled = [
    character.imageUrl,
    character.status,
    character.gender,
    character.heightCm,
    character.occupation,
    character.debutEpisode,
    character.voiceActorJp,
  ].filter((value) => value !== null && value !== undefined).length;

  const lists = [
    character.species,
    character.affiliations,
    character.formerAffiliations,
    character.titanForms,
  ].filter((list) => list !== null && list.length > 0).length;

  return filled + lists + (character.isTitanShifter ? 1 : 0);
};

/** Toggle a value in or out of a multi-select facet. */
export const toggle = <T>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export const sortCharacters = (
  characters: Character[],
  key: SortKey,
): Character[] =>
  [...characters].sort((a, b) =>
    key === "name"
      ? a.name.localeCompare(b.name)
      : recordDepth(b) - recordDepth(a) || a.name.localeCompare(b.name),
  );
