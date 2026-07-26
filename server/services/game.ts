/**
 * The drill. Logic only — nothing in here knows what an HTTP request is.
 *
 * The answer is held server-side for the whole game. `toGameState` is the one
 * place that decides whether it may be sent, so there is a single line to audit
 * rather than a rule spread across handlers.
 */

import { randomUUID } from "node:crypto";
import type { Character } from "../types/character";
import type {
  Comparison,
  GameState,
  GameStatus,
  GuessResult,
  Match,
  NewGame,
  NumericMatch,
} from "../types/game";
import { findCharacters, listCharacterIds } from "./roster";

export const MAX_GUESSES = 8;

interface Game {
  gameId: string;
  answerId: number;
  /** Submission order, oldest first. */
  guessIds: number[];
}

/**
 * Deliberately in memory: restarting the API drops games in progress, which is
 * acceptable for now. A Postgres table is the later upgrade.
 */
const games = new Map<string, Game>();

// ---------------------------------------------------------------------------
// The comparison — pure, and testable without HTTP or a database.
// ---------------------------------------------------------------------------

/** Current and former postings together, matching how the archive filters. */
const postings = (character: Character): string[] => [
  ...(character.affiliations ?? []),
  ...(character.formerAffiliations ?? []),
];

const equals = <T>(guess: T | null, answer: T | null): Match =>
  guess !== null && answer !== null && guess === answer ? "exact" : "none";

/**
 * Two records with nothing on file are not a match. Claiming "exact" on an
 * absent posting would tell the player something the archive never recorded,
 * so an empty side is always a miss.
 */
const compareAffiliations = (guess: Character, answer: Character): Match => {
  const held = new Set(postings(guess));
  const wanted = new Set(postings(answer));
  if (held.size === 0 || wanted.size === 0) return "none";

  const shared = [...held].filter((posting) => wanted.has(posting));
  if (shared.length === 0) return "none";

  return shared.length === held.size && shared.length === wanted.size
    ? "exact"
    : "partial";
};

/** Only 112 of 189 records carry a height, so "unknown" is a routine outcome. */
const compareHeight = (
  guess: number | null,
  answer: number | null,
): NumericMatch => {
  if (guess === null || answer === null) return "unknown";
  if (guess === answer) return "exact";
  return answer > guess ? "higher" : "lower";
};

export const compareCharacters = (
  guess: Character,
  answer: Character,
): Comparison => ({
  status: equals(guess.status, answer.status),
  gender: equals(guess.gender, answer.gender),
  isTitanShifter: guess.isTitanShifter === answer.isTitanShifter
    ? "exact"
    : "none",
  affiliations: compareAffiliations(guess, answer),
  heightCm: compareHeight(guess.heightCm, answer.heightCm),
});

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

const statusOf = (game: Game): GameStatus => {
  if (game.guessIds.includes(game.answerId)) return "won";
  return game.guessIds.length >= MAX_GUESSES ? "lost" : "playing";
};

/**
 * The answer row is loaded on every call because the comparisons need it, and
 * attached to the response only once the game is over.
 */
const toGameState = async (game: Game): Promise<GameState> => {
  const rows = await findCharacters([...game.guessIds, game.answerId]);
  const answer = rows.get(game.answerId);
  if (!answer) throw new Error(`answer ${game.answerId} is no longer on file`);

  const guesses: GuessResult[] = [];
  for (const id of game.guessIds) {
    const character = rows.get(id);
    if (character) {
      guesses.push({ character, ...compareCharacters(character, answer) });
    }
  }

  const status = statusOf(game);

  return {
    gameId: game.gameId,
    guesses,
    maxGuesses: MAX_GUESSES,
    status,
    answer: status === "playing" ? null : answer,
  };
};

export const createGame = async (): Promise<NewGame> => {
  const ids = await listCharacterIds();
  if (ids.length === 0) throw new Error("no characters on file");

  const game: Game = {
    gameId: randomUUID(),
    answerId: ids[Math.floor(Math.random() * ids.length)],
    guessIds: [],
  };
  games.set(game.gameId, game);

  return {
    gameId: game.gameId,
    maxGuesses: MAX_GUESSES,
    totalCharacters: ids.length,
  };
};

export type GuessRejection =
  | "unknown-game"
  | "unknown-character"
  | "already-guessed"
  | "game-over";

export type GuessOutcome =
  | { ok: true; state: GameState }
  | { ok: false; reason: GuessRejection };

/** Union rather than exceptions: rejection is an expected path, not a fault. */
export const submitGuess = async (
  gameId: string,
  characterId: number,
): Promise<GuessOutcome> => {
  const game = games.get(gameId);
  if (!game) return { ok: false, reason: "unknown-game" };
  if (statusOf(game) !== "playing") return { ok: false, reason: "game-over" };
  if (game.guessIds.includes(characterId)) {
    return { ok: false, reason: "already-guessed" };
  }

  const found = await findCharacters([characterId]);
  if (!found.has(characterId)) {
    return { ok: false, reason: "unknown-character" };
  }

  game.guessIds.push(characterId);
  return { ok: true, state: await toGameState(game) };
};

/** Null when the id is unknown — including after an API restart. */
export const readGame = async (gameId: string): Promise<GameState | null> => {
  const game = games.get(gameId);
  return game ? await toGameState(game) : null;
};
