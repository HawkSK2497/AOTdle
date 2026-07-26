/** URL shapes for the drill. Mounted at /api/game. */

import { Router } from "express";
import { getGame, postGame, postGuess } from "../controllers/game";

export const gameRouter = Router();

gameRouter.post("/", postGame);
gameRouter.get("/:id", getGame);
gameRouter.post("/:id/guess", postGuess);
