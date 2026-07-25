/**
 * Minimal API between Postgres and the React app.
 *
 *   npm run api
 *
 * The browser cannot talk to Postgres directly, so this process holds the
 * database connection and exposes plain JSON over HTTP.
 */

import express from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { characters } from "../db/schema";

const app = express();
const PORT = 3001;

/** All characters, alphabetical. */
app.get("/api/characters", async (_req, res) => {
  try {
    const rows = await db
      .select({
        // Explicit column list: rawInfobox is large and the client never
        // needs it, so keep it out of the payload.
        id: characters.id,
        name: characters.name,
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
      })
      .from(characters)
      .orderBy(asc(characters.name));

    res.json(rows);
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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
