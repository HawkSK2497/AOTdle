/**
 * The only place in web/ that talks to the network.
 *
 * Components never call fetch. They read data through the hooks in this
 * directory, which wrap these two functions.
 */

import type {
  Character,
  CharacterDetail,
} from "../../../server/types/character";

/**
 * A failed request, carrying enough detail for the UI to say something more
 * useful than "something went wrong".
 */
export class ApiError extends Error {
  readonly status: number;
  /** True when the API could not be reached at all — usually `npm run api`. */
  readonly offline: boolean;

  constructor(message: string, status: number, offline: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
  }
}

const request = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  let res: Response;

  try {
    res = await fetch(path, { signal });
  } catch (err) {
    // AbortError is a caller-initiated cancellation, not a failure — let it
    // through untouched so hooks can ignore it.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Could not reach the archive API.", 0, true);
  }

  if (!res.ok) {
    // In dev the request goes through Vite's proxy, which answers 502/504 when
    // nothing is listening on 3001. That is a dead API, not a failing one, and
    // the advice the user needs is different.
    const unreachable = res.status === 502 || res.status === 504;

    throw new ApiError(
      unreachable
        ? "Could not reach the archive API."
        : `The archive API responded with ${res.status}.`,
      res.status,
      unreachable,
    );
  }

  return (await res.json()) as T;
};

/** Every character, alphabetical. 189 records — fetched once, filtered locally. */
export const fetchCharacters = (signal?: AbortSignal): Promise<Character[]> =>
  request<Character[]>("/api/characters", signal);

/** One character's full service record. */
export const fetchCharacter = (
  id: number,
  signal?: AbortSignal,
): Promise<CharacterDetail> =>
  request<CharacterDetail>(`/api/characters/${id}`, signal);
