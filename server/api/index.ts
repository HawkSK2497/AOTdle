/**
 * Minimal API between Postgres and the React app.
 *
 *   npm run api
 *
 * The browser cannot talk to Postgres directly, so this process holds the
 * database connection and exposes plain JSON over HTTP.
 */

import express from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { characters } from "../db/schema";
import { gameRouter } from "../routes/game";
import { listCharacters } from "../services/roster";

const app = express();
const PORT = 3001;

app.use(express.json());

/** All characters, alphabetical. The column list lives in services/roster.ts. */
app.get("/api/characters", async (_req, res) => {
  try {
    res.json(await listCharacters());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load characters" });
  }
});

/** One character, full detail. */
app.get("/api/characters/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const [row] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load character" });
  }
});

app.use("/api/game", gameRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
