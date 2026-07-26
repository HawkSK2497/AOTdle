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
import type { GameState, NewGame } from "../../../server/types/game";

/**
 * A failed request, carrying enough detail for the UI to say something more
 * useful than "something went wrong".
 */
export class ApiError extends Error {
  readonly status: number;
  /** True when the API could not be reached at all — usually `npm run server`. */
  readonly offline: boolean;
  /**
   * The API's own explanation, when it sent one. The drill rejects guesses
   * with a reason worth repeating to the player; the archive keeps its
   * generic wording and ignores this.
   */
  readonly detail: string | null;

  constructor(
    message: string,
    status: number,
    offline: boolean,
    detail: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
    this.detail = detail;
  }
}

/** The `{ error }` body the API sends with a 4xx, if it parses. */
const explanation = async (res: Response): Promise<string | null> => {
  try {
    const body: unknown = await res.json();
    const error =
      body && typeof body === "object" ? (body as { error?: unknown }).error : null;
    return typeof error === "string" ? error : null;
  } catch {
    return null;
  }
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let res: Response;

  try {
    res = await fetch(path, init);
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
      unreachable ? null : await explanation(res),
    );
  }

  return (await res.json()) as T;
};

/** Every character, alphabetical. 189 records — fetched once, filtered locally. */
export const fetchCharacters = (signal?: AbortSignal): Promise<Character[]> =>
  request<Character[]>("/api/characters", { signal });

/** One character's full service record. */
export const fetchCharacter = (
  id: number,
  signal?: AbortSignal,
): Promise<CharacterDetail> =>
  request<CharacterDetail>(`/api/characters/${id}`, { signal });

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Opens a drill. The answer stays on the server; this only names the game. */
export const startGame = (): Promise<NewGame> =>
  request<NewGame>("/api/game", { method: "POST" });

/** The board as the server sees it — used to survive a page refresh. */
export const fetchGame = (
  gameId: string,
  signal?: AbortSignal,
): Promise<GameState> => request<GameState>(`/api/game/${gameId}`, { signal });

export const sendGuess = (
  gameId: string,
  characterId: number,
): Promise<GameState> =>
  request<GameState>(`/api/game/${gameId}/guess`, json({ characterId }));
