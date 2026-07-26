/**
 * Request in, response out. Every decision about the game itself belongs in
 * services/game.ts.
 */

import type { Request, Response } from "express";
import type { GuessRejection } from "../services/game";
import { createGame, readGame, submitGuess } from "../services/game";

/** Rejections are the player's situation, not a server fault — say which. */
const REJECTION: Record<GuessRejection, { status: number; error: string }> = {
  "unknown-game": {
    status: 404,
    error: "That game is no longer in progress. Start a new one.",
  },
  "unknown-character": { status: 404, error: "No such character on file." },
  "already-guessed": { status: 409, error: "That character was already guessed." },
  "game-over": { status: 409, error: "This game has finished." },
};

/** Express 5 types a route param as `string | string[]`; ours is always one. */
const gameId = (req: Request): string => String(req.params.id);

export const postGame = async (_req: Request, res: Response) => {
  try {
    res.json(await createGame());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to start a game" });
  }
};

export const postGuess = async (req: Request, res: Response) => {
  try {
    const characterId = Number((req.body as { characterId?: unknown })?.characterId);
    if (!Number.isInteger(characterId)) {
      return res.status(400).json({ error: "characterId must be an integer" });
    }

    const outcome = await submitGuess(gameId(req), characterId);
    if (!outcome.ok) {
      const { status, error } = REJECTION[outcome.reason];
      return res.status(status).json({ error });
    }

    res.json(outcome.state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to record the guess" });
  }
};

export const getGame = async (req: Request, res: Response) => {
  try {
    const state = await readGame(gameId(req));
    if (!state) {
      return res.status(404).json({ error: REJECTION["unknown-game"].error });
    }

    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load the game" });
  }
};
