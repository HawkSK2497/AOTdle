# AOTdle

A character database and (eventually) daily guessing game built on data scraped
from the Attack on Titan wiki. The scraping pipeline and API are **done**. The
frontend is what needs building.

---

## Repository layout

```
scripts/            Node: one-off tasks (scraper, audit, setup)
server/
  api/index.ts      Express API, port 3001
  config/env.ts
  controllers/      scaffolded, empty
  db/
    index.ts        Drizzle client + pg Pool
    schema.ts       Single source of truth for data shape
  lib/
    parse-wikitext.ts   MediaWiki parser. Do not modify for frontend work.
  routes/           scaffolded, empty
  services/         scaffolded, empty
  types/            shared type definitions
web/
  public/
  src/
    api/            Fetch client. Components never call fetch directly.
    components/
    main.tsx

Empty directories are held by .gitkeep. Delete the .gitkeep when you add a
real file to one.
```

### The one hard rule

`web/` runs in the browser. It must **never** import from `server/db`,
`server/lib`, or anything using `pg` / `drizzle-orm`. Those are Node-only; Vite
will fail to bundle them, and it would leak the database credentials.

The single exception is `server/types/`, which holds type-only declarations
and may be imported from `web/` using `import type`. Everything else in
`server/` is off limits to the browser.

All data reaches the frontend through `fetch("/api/...")`.

---

## Commands

Run from the repo root.

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite dev server (frontend)                  |
| `npm run api`       | Express API on :3001                        |
| `npm run db:studio` | Browse the database                         |
| `npm run db:push`   | Apply schema changes to Postgres            |
| `npm run db:scrape` | Re-scrape the wiki (~10 min, rarely needed) |
| `npm run setup`     | Full setup for a fresh clone                |

Frontend work needs `npm run dev` and `npm run api` running together. Vite
proxies `/api` to port 3001 (configured in `web/vite.config.ts`).

---

## The data

~189 characters. Roughly 140 have a height, most have an image, a handful have
neither.

### `GET /api/characters`

Returns an array, alphabetical by name:

```ts
type Character = {
  id: number;
  name: string; // "Eren Yeager"
  imageUrl: string | null; // Fandom CDN URL
  status: "Alive" | "Deceased" | "Unknown" | null;
  species: string[] | null; // ["Human", "Intelligent Titan"]
  gender: string | null;
  heightCm: number | null; // human form only, 145-190 typical
  affiliations: string[] | null; // current, e.g. ["Yeagerists"]
  formerAffiliations: string[] | null;
  occupation: string | null;
  isTitanShifter: boolean;
  titanForms: string[] | null; // ["Attack Titan", "Founding Titan"]
  debutEpisode: string | null;
  voiceActorJp: string | null;
};
```

### `GET /api/characters/:id`

Same fields plus `kanji`, `romaji`, `aliases`, `birthday`, `birthplace`,
`residence`, `rank`, `formerRank`, `gradRank`, `titanKillsTotal`,
`debutChapter`, `weightKg`, `wikiTitle`.

Ignore `rawInfobox` — it's a debugging escape hatch, not display data.

### Data realities to design around

- **Nulls are common.** Minor characters have a name and little else. Every
  field except `id` and `name` can be missing. Design the card and detail view
  so a sparse character still looks deliberate, not broken.
- **A lot of characters are obscure.** `11th Commander`, `Alma`, `Anka`. The
  interface should make the recognizable ones findable rather than presenting
  all 189 as equally important.
- **`heightCm` is human height only.** Titan forms are 4-60m and deliberately
  excluded. Do not mix them into a height comparison.
- **Images are hotlinked from Fandom.** Some will 404. Always handle image
  load failure with a styled fallback, never a broken-image icon.

### Where types live

`server/types/character.ts` is the single definition of `Character` and is
shared by both sides. The frontend imports it as a **type-only** import:

```ts
import type { Character } from "../../../server/types/character";
```

That file must contain only `type` and `interface` declarations — no imports
from Drizzle, no runtime values. `import type` is erased at compile time, so
nothing reaches the browser bundle. Adding a runtime export to it would break
that and pull server code into the client.

The type must match `server/db/schema.ts`. Check the schema, don't guess.
Do not create a second copy of `Character` in `web/`.

---

## Design direction

**Concept: the Survey Corps archive.** This is a military records system, not a
fan page. Utilitarian, data-forward, restrained. The tone comes from the
material — service records, expedition logs, casualty lists — not from anime
imagery.

Two things about this dataset should drive the design:

1. **Scale is the franchise's central obsession.** Titans are classified in
   meters, the Walls are 50m. You have real height data on ~140 characters.
2. **`status` is not a neutral field.** In this series, alive versus deceased
   carries the emotional weight. Let the design acknowledge that without
   melodrama.

### Signature element

Build **one** memorable thing and keep everything else quiet around it. The
strongest candidate is a **height comparison**: select characters and see them
on a shared ruler, marked in centimeters. It is the most characteristic idea in
the subject's world, it runs on data you already have, and no other character
database does it.

If you find a better idea grounded in the actual data, take it — but justify it
against this one, and commit to a single signature rather than several.

### Palette

Starting point, not a mandate. Deviate if you can justify it, but stay away
from warm cream backgrounds with terracotta accents, and from near-black with a
single neon accent. Both are generic AI-design defaults and neither says
anything about this subject.

```
--iron        #1C1F22   base, cold and heavy
--slate       #2A2E33   raised surfaces
--bone        #DED9CE   primary text, aged paper
--brass       #A8873E   accent, oxidized fittings
--oxblood     #6E2226   deceased status, alerts
--verdigris   #4A7A6F   titan shifters, secondary data
```

Cold and metallic, not warm and cosy. Reserve `oxblood` and `verdigris` for
data meaning — status and shifter — so color carries information rather than
decorating.

### Typography

Pair a **condensed** face for headings and labels with a neutral body face, and
use a **monospace for all numeric data** — heights, episode numbers, kill
counts. Monospaced figures reinforce the records-system concept and make the
height comparison legible.

IBM Plex Sans Condensed / IBM Plex Sans / IBM Plex Mono is a coherent starting
set. Choose differently if you have a stronger idea, but avoid a high-contrast
serif display face — it pulls toward the editorial-magazine default.

Set a deliberate type scale. Labels should be small, uppercase, letterspaced,
in the condensed face — the vernacular of a form field on a service record.

### Structure

Structural devices must encode something true. Do not number things that are
not a sequence. Status, affiliation, and shifter state are real categories worth
expressing visually; decorative dividers and eyebrow labels that say nothing are
not.

### Motion

Restrained. One orchestrated moment beats scattered effects. The height
comparison animating as characters are added is worth doing well; hover
transforms on every card are not. Respect `prefers-reduced-motion`.

### Do not

- Recreate the official Survey Corps emblem or the series logo. Original
  geometry inspired by the aesthetic only.
- Use anime screenshots as background imagery. Character portraits from the API
  are the only images.
- Add a "battle" or "power level" framing. This is an archive, not a game — the
  guessing game comes later and lives on its own route.

---

## What to build first

A single-page character browser at `/`:

- **Grid of character cards** — portrait, name, status, primary affiliation.
  Cards must degrade gracefully when fields are null.
- **Search** by name, filtering as you type.
- **Filters** for status, titan shifter, and affiliation. Affiliation values
  come from the data, not a hardcoded list — derive them from the response.
- **Detail view** — panel or modal — showing the full record from
  `/api/characters/:id`.
- **The height comparison**, as the signature element.
- **Real loading, empty, and error states.** "No characters match these
  filters" with a way to clear them; a genuine error message if the API is
  down, not a silent empty grid.

### Quality floor

Assume these rather than announcing them: responsive to mobile, visible
keyboard focus, images lazy-loaded, `alt` text on every portrait, filters
operable by keyboard.

189 records is small enough to fetch once and filter client-side. Do not build
pagination or server-side search.

---

## Conventions

- TypeScript throughout, no `any` in `web/`.
- Tailwind for styling. **Check `package.json` for the version first** — v4
  configures through CSS, v3 through `tailwind.config.js`. Do not assume.
- Define design tokens once (CSS custom properties or Tailwind theme config)
  and reference them. No hardcoded hex values scattered through components.
- Components in `web/src/components/`, one per file.
- All network calls in `web/src/api/`. Components receive data as props or
  through a hook, never `fetch` inline.
- `oxlint` is the linter — `npm run lint` must pass.
- The empty server/ directories are deliberate scaffolding for later. Do not
  refactor server/api/index.ts into them as part of frontend work — the API
  is working and out of scope.

---

## Before you consider it done

- `npm run lint` passes and `npm run build` succeeds.
- Works with `npm run api` running; fails informatively when it isn't.
- A character with only a name and no other data renders without looking broken.
- A character with a dead `imageUrl` shows the fallback.
- Keyboard-only navigation reaches every control.
- Nothing in `web/` imports from `server/db` or `server/lib`, and any import
  from `server/types` uses `import type`.
