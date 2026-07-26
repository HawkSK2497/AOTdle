# AOTdle

An Attack on Titan character archive and a Wordle-style character guessing
game, sharing one database and one design system.

The scraper, API, archive UI, and the guessing game are **built and working**.

---

## Repository layout

```
index.html            Vite entry. At the repo root, not in web/.
vite.config.ts        Also at the root. Contains the /api proxy.
drizzle.config.ts
server/
  api/index.ts        Express API, port 3001
  config/env.ts
  controllers/game.ts Request and response for the drill
  db/
    index.ts          Drizzle client + pg Pool
    schema.ts         Single source of truth for data shape
  lib/
    parse-wikitext.ts MediaWiki parser. Out of scope for UI work.
  routes/game.ts      URL shapes, mounted at /api/game
  scripts/            ingest, audit, setup
  services/
    game.ts           The drill: pure comparison + in-memory games
    roster.ts         The shared list-shaped character projection
  types/              shared type definitions
web/
  public/
  src/
    api/              All network access. Components never call fetch directly.
    components/       ~25 components (archive UI + drill), main.tsx routes
    lib/format.ts     Display-time formatting helpers
    lib/game.ts       Verdict-to-tile mapping, roster autocomplete
    index.css         Tailwind v4 @theme block - design tokens live here
    main.tsx
```

Empty directories are held by `.gitkeep`. Delete the `.gitkeep` when you add a
real file.

### The one hard rule

`web/` runs in the browser. It must **never** import from `server/db`,
`server/lib`, or anything using `pg` / `drizzle-orm`. Those are Node-only, and
it would leak database credentials into the bundle.

All data reaches the frontend through `fetch("/api/...")`.

---

## Commands

Run from the repo root.

| Command | What it does |
| --- | --- |
| `npm run start` | Frontend + API together (concurrently) |
| `npm run dev` | Vite dev server only |
| `npm run api` | Express API on :3001 only |
| `npm run lint` | oxlint - must pass |
| `npm run build` | `tsc -b && vite build` - must pass |
| `npm run db:studio` | Browse the database |
| `npm run db:push` | Apply schema changes to Postgres |
| `npm run db:scrape` | Re-scrape the wiki (~10 min, rarely needed) |

---

## The data

189 characters. Verified counts, not estimates:

- `status` is **never null**: 117 Deceased, 52 Alive, 20 Unknown
- `heightCm` exists on **112** records
- Every other field can be null

### `GET /api/characters`

```ts
type Character = {
  id: number;
  name: string;
  aliases: string[] | null;   // only 33 records carry any
  imageUrl: string | null;
  status: "Alive" | "Deceased" | "Unknown";
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
};
```

`GET /api/characters/:id` adds `kanji`, `romaji`, `birthday`, `birthplace`,
`residence`, `rank`, `formerRank`, `gradRank`, `titanKillsTotal`,
`debutChapter`, `weightKg`, `wikiTitle`.

The column list for the list shape lives once in `server/services/roster.ts`
and is used by both the archive endpoint and the drill.

Ignore `rawInfobox` - it is a debugging escape hatch, not display data.

### Known data issue: portrait URLs

Every scraped `imageUrl` carries a `/revision/latest?cb=...` suffix that Fandom
no longer serves. All 189 return 404 in that form; the bare URL returns 200.

**Fandom answers those 404s with a decodable 300x171 JPEG**, so the browser
fires `load`, not `error`. An `onError` handler alone can never catch this.

`web/src/lib/format.ts` already strips the suffix and detects the placeholder
by its intrinsic size. **Reuse those helpers. Do not reimplement image handling
and do not add a bare `<img src={character.imageUrl}>` anywhere.**

This is patched at display time only. `npm run db:scrape` will store the dead
form again. The durable fix belongs in the scraper and is out of scope.

---

## Design system

Concept: **the Survey Corps archive**. Military records, utilitarian, restrained.
Not a fan page. The tone comes from the material - service records, expedition
logs, casualty lists.

Tokens are defined once in `web/src/index.css` as a Tailwind v4 `@theme` block.
Reference them. Never hardcode a hex value in a component.

```
iron        base, cold and heavy
slate       raised surfaces
bone        primary text, aged paper
brass       accent, focus rings
oxblood     Deceased status
verdigris   titan shifters, secondary data
```

### Established conventions - follow these, do not reinvent

- `status` is never null, so **Deceased is the marked state and Alive is left
  unstyled.** That is what keeps oxblood meaningful. Do not add a green
  "alive" treatment.
- Sparse records **omit empty field groups entirely** rather than padding with
  dashes.
- Null-image records show an initials-on-hatch plate.
- Affiliation matching considers **current or former**. Filtering "Survey
  Corps" must still match Eren, who left.
- Numeric data uses the monospace face.
- Focus rings are brass and must stay visible on every interactive control.
- Motion is restrained and respects `prefers-reduced-motion`.

---

## What already exists

The archive at `/`: character grid, name search, filters for status, shifter,
and affiliation, a detail panel, and a zero-based height ruler with a median
reference line. Default sort is record completeness, which floats recognizable
characters up without a hardcoded popularity list.

Do not refactor it as part of game work.

---

## The drill

The guessing game at `/play`. A record is drawn from all 189; the player names
it in **8 guesses**, and each guess comes back as a row of attribute verdicts.

`react-router-dom` carries the two routes. `SiteHeader` is the strip they
share; the archive's own masthead still belongs to `/`.

### Server-authoritative

The answer never reaches the client before the game ends. Comparison runs on
the server, and `toGameState` in `server/services/game.ts` is the only place
that decides whether `answer` may be sent — one line to audit.

```
POST /api/game              -> { gameId, maxGuesses, totalCharacters }
POST /api/game/:id/guess    -> body { characterId }, returns GameState
GET  /api/game/:id          -> current GameState, for page refresh
```

Games live in an in-memory `Map`, so restarting `npm run api` drops them. The
client keeps its `gameId` in sessionStorage; a forgotten id 404s and opens a
fresh game in its place. A Postgres table is the later upgrade.

`compareCharacters(guess, answer)` is pure — two rows in, verdicts out, no
HTTP and no database.

### The compared attributes

Chosen against measured coverage of the 189 records:

| Attribute | Coverage | |
| --- | --- | --- |
| `status` | 189 | never null |
| `gender` | 188 | |
| `isTitanShifter` | 189 | boolean, never null |
| `affiliations` | 153 | partial on any overlap, current **or** former |
| `heightCm` | 112 | `unknown` whenever either side is null |

**`species` was dropped.** Coverage is complete, but 176 of 189 are `Human`
and the rest nearly duplicate `isTitanShifter` — it read "exact" on almost
every guess. `debutEpisode` (181) is well covered and is the obvious candidate
if the board ever wants a sixth column.

### Interface rules

- **Colour never carries a verdict alone.** Every tile spells out `Match`,
  `Partial`, `Miss` or `No record`; height adds a direction word and arrow.
  `exact` is verdigris, `partial` brass, `none` slate.
- **Oxblood stays out of the tile grid.** Inside a tile, colour means how close
  the guess was — a "Deceased ✓" tile is a match, not a casualty. Portraits in
  a guess row keep the archive's muted-when-deceased treatment.
- A grid cannot omit columns the way a sparse record omits field groups, so
  absent data renders as `No record`, distinct from a miss.
- Newest guess at the top. Autocomplete matches names and aliases, excludes
  what has already been guessed, and is fully keyboard-operable.
- The end state reveals the answer inline, not in a modal — the board stays
  readable beside it.

### Deliberately not built

No daily-puzzle mode, no streaks, no share-to-clipboard grid, no hints.

---

## Conventions

- TypeScript throughout. No `any` in `web/`.
- **Arrow functions only.** `export const Foo = () => { ... }`, never the
  `function` keyword. Components, handlers, helpers, all of it.
- **No dynamic `import()`.** Static imports only, everywhere.
- **Tailwind v4.** Tokens live in the `@theme` block in `web/src/index.css`,
  configured through CSS, not a `tailwind.config.js`.
- Components in `web/src/components/`, one per file.
- All network calls in `web/src/api/`.
- Server code splits into `routes/` (URL shapes), `controllers/` (request and
  response), `services/` (logic, no HTTP knowledge).
- The API is served through Vite's proxy at `/api`. It is plain **http**, not
  https.

---

## Before you consider it done

- `npm run lint` and `npm run build` both pass.
- The answer is not present in any network response until the game ends. Verify
  in the network tab, not by reading the code.
- A character with a null height renders `"unknown"`, distinct from a miss.
- A character with no image shows the initials plate.
- Every tile is readable without colour.
- Autocomplete is fully keyboard-operable.
- 375px viewport has no horizontal overflow.
- Killing the API produces a real error message, not a silent empty state.
  Note that the proxy turns a dead API into a 502, not a network failure.
- Nothing in `web/` imports from `server/db` or `server/lib`.
- The archive at `/` still works exactly as before.
