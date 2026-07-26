/**
 * Shared between the API and the frontend.
 * TYPES ONLY - no runtime exports, no Drizzle imports.
 */

import type { Character } from "./character";

export type Match = "exact" | "partial" | "none";
export type NumericMatch = "exact" | "higher" | "lower" | "unknown";

export type GameStatus = "playing" | "won" | "lost";

/** The comparison alone, with no character attached — what the pure function returns. */
export interface Comparison {
  status: Match;
  gender: Match;
  isTitanShifter: Match;
  /** Partial on any overlap, counting former postings as well as current. */
  affiliations: Match;
  /** "higher" means the ANSWER is taller than the guess. */
  heightCm: NumericMatch;
}

export interface GuessResult extends Comparison {
  /** The guessed character, for display. Never the answer. */
  character: Character;
}

export interface GameState {
  gameId: string;
  /** Submission order, oldest first. The board reverses it for display. */
  guesses: GuessResult[];
  maxGuesses: number;
  status: GameStatus;
  /** Null until the game is won or lost. */
  answer: Character | null;
}

/** Response to POST /api/game. */
export interface NewGame {
  gameId: string;
  maxGuesses: number;
  totalCharacters: number;
}
