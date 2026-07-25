/**
 * Parses Attack on Titan Fandom wikitext into structured character data.
 *
 * The wiki uses MediaWiki templates, which nest. That means you cannot use a
 * plain regex: `{{Infobox character ... }}` contains `{{ref|...}}` blocks which
 * contain their own `}}`, and `|` separators appear inside nested templates.
 * So everything here is brace-aware: we walk the string and count depth.
 */

/* ------------------------------------------------------------------ */
/* Low-level scanning                                                  */
/* ------------------------------------------------------------------ */

/**
 * Reads a balanced block starting at `start`, e.g. `{{a|{{b}}}}`.
 * Returns the block text and the index just past its closing delimiter.
 */
function readBalanced(
  text: string,
  start: number,
  open: string,
  close: string,
): { text: string; end: number } | null {
  if (!text.startsWith(open, start)) return null;
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.startsWith(open, i)) {
      depth++;
      i += open.length;
    } else if (text.startsWith(close, i)) {
      depth--;
      i += close.length;
      if (depth === 0) return { text: text.slice(start, i), end: i };
    } else {
      i++;
    }
  }
  return null; // unbalanced
}

/** Splits on `|` characters that are NOT inside a nested {{...}} or [[...]]. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let current = "";
  let tmpl = 0;
  let link = 0;
  let i = 0;

  while (i < inner.length) {
    if (inner.startsWith("{{", i)) {
      tmpl++;
      current += "{{";
      i += 2;
    } else if (inner.startsWith("}}", i)) {
      tmpl--;
      current += "}}";
      i += 2;
    } else if (inner.startsWith("[[", i)) {
      link++;
      current += "[[";
      i += 2;
    } else if (inner.startsWith("]]", i)) {
      link--;
      current += "]]";
      i += 2;
    } else if (inner[i] === "|" && tmpl === 0 && link === 0) {
      parts.push(current);
      current = "";
      i++;
    } else {
      current += inner[i];
      i++;
    }
  }
  parts.push(current);
  return parts;
}

/** Finds every occurrence of a named template, returning the full blocks. */
export function findTemplates(wikitext: string, name: string): string[] {
  const re = new RegExp(`\\{\\{\\s*${name}\\b`, "gi");
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext)) !== null) {
    const block = readBalanced(wikitext, m.index, "{{", "}}");
    if (block) {
      found.push(block.text);
      re.lastIndex = block.end;
    }
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* Template parameter parsing                                          */
/* ------------------------------------------------------------------ */

/**
 * Infobox keys are NOT consistent across pages: Eren uses "Grad rank" and
 * "Image 1", Hannes uses "Grad Rank", Reiner uses "Image". Looking fields up
 * by exact string silently loses data, so all lookups go through this, which
 * lowercases and collapses whitespace.
 */
export function fieldGetter(fields: Record<string, string>) {
  const normalised: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    normalised[key.toLowerCase().replace(/\s+/g, " ").trim()] = value;
  }
  return (name: string): string | undefined =>
    normalised[name.toLowerCase().replace(/\s+/g, " ").trim()];
}

/** Turns a `{{Name|Key = Value|...}}` block into a key/value object. */
export function templateToFields(block: string): Record<string, string> {
  const inner = block.slice(2, -2); // drop {{ and }}
  const params = splitTopLevel(inner).slice(1); // drop template name
  const fields: Record<string, string> = {};

  for (const param of params) {
    const eq = param.indexOf("=");
    if (eq === -1) continue; // positional arg, not used by these infoboxes
    const key = param.slice(0, eq).trim();
    const value = param.slice(eq + 1).trim();
    if (key) fields[key] = value;
  }
  return fields;
}

/* ------------------------------------------------------------------ */
/* Value cleaning                                                      */
/* ------------------------------------------------------------------ */

/** Templates whose content is citation noise — removed entirely. */
const DROP_TEMPLATES = new Set(["ref", "references", "clear"]);

/**
 * Templates where the first argument is the display value.
 *   {{tt|170 cm|5'7"}}      -> "170 cm"
 *   {{org|Survey Corps}}    -> "Survey Corps"
 *   {{loc|Wall Rose}}       -> "Wall Rose"
 *   {{w|Yuki Kaji}}         -> "Yuki Kaji"
 *   {{nihongo|"Founder"|..}} -> "\"Founder\""
 */
const FIRST_ARG_TEMPLATES = new Set([
  "tt",
  "org",
  "loc",
  "w",
  "fam",
  "nihongo",
]);

/** Recursively strips wiki markup from a field value. */
function unwrap(text: string): string {
  let out = "";
  let i = 0;

  while (i < text.length) {
    if (text.startsWith("{{", i)) {
      const block = readBalanced(text, i, "{{", "}}");
      if (!block) {
        out += text[i++];
        continue;
      }
      const params = splitTopLevel(block.text.slice(2, -2));
      const name = params[0].trim().toLowerCase();

      if (DROP_TEMPLATES.has(name)) {
        // skip entirely
      } else if (FIRST_ARG_TEMPLATES.has(name)) {
        out += unwrap(params[1] ?? "");
      } else {
        // Unknown template: keep its arguments rather than losing data
        out += unwrap(params.slice(1).join(" "));
      }
      i = block.end;
      continue;
    }

    if (text.startsWith("[[", i)) {
      const block = readBalanced(text, i, "[[", "]]");
      if (!block) {
        out += text[i++];
        continue;
      }
      const parts = block.text.slice(2, -2).split("|");
      // [[Target|Display]] -> Display ; [[Target]] -> Target
      out += parts[parts.length - 1];
      i = block.end;
      continue;
    }

    out += text[i++];
  }
  return out;
}

/** Full clean: unwrap templates/links, normalise breaks, strip formatting. */
export function cleanValue(raw: string): string {
  let text = unwrap(raw);
  text = text.replace(/<br\s*\/?>/gi, "\n"); // line breaks become newlines
  text = text.replace(/<[^>]+>/g, ""); // any other HTML
  text = text.replace(/'''/g, "").replace(/''/g, ""); // bold / italic
  text = text.replace(/&nbsp;/g, " ");
  text = text
    .split("\n")
    .map((line) => line.replace(/^[*#:;]+\s*/, "").trim()) // bullets
    .filter(Boolean)
    .join("\n");
  return text.trim();
}

/** Cleans a value that represents multiple items, returning an array. */
export function cleanList(raw: string): string[] {
  const cleaned = cleanValue(raw);
  if (!cleaned) return [];
  return cleaned
    .split(/\n|,(?![^(]*\))/) // newlines, or commas outside parentheses
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Field extraction                                                    */
/* ------------------------------------------------------------------ */

const STATUSES = ["Alive", "Deceased", "Unknown"] as const;
export type Status = (typeof STATUSES)[number];

function normaliseStatus(raw?: string): Status {
  const value = cleanValue(raw ?? "").toLowerCase();
  if (value.startsWith("alive")) return "Alive";
  if (value.startsWith("deceased") || value.includes("dead")) return "Deceased";
  return "Unknown";
}

/**
 * Height needs care: characters have multiple entries, including Titan forms.
 *   "170 cm (850) / 183 cm (854) / 4 m (Pure Titan form) / 15 m (Attack ...)"
 * We want the first HUMAN measurement in cm, so we drop any line mentioning
 * a Titan form and take the first `N cm` we find.
 */
function parseHeightCm(raw?: string): number | null {
  if (!raw) return null;
  const lines = cleanValue(raw)
    .split("\n")
    .filter((line) => !/titan/i.test(line));
  for (const line of lines) {
    const m = line.match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (m) return Math.round(parseFloat(m[1]));
  }
  return null;
}

function parseWeightKg(raw?: string): number | null {
  if (!raw) return null;
  const lines = cleanValue(raw)
    .split("\n")
    .filter((line) => !/titan/i.test(line));
  for (const line of lines) {
    const m = line.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (m) return Math.round(parseFloat(m[1]));
  }
  return null;
}

/** "5th" -> 5 */
function parseOrdinal(raw?: string): number | null {
  if (!raw) return null;
  const m = cleanValue(raw).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Titan kill counts end with "Total: 23" once bold markers are stripped. */
function parseTitanKills(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = cleanValue(raw);
  const total = cleaned.match(/total:?\s*(\d+)/i);
  if (total) return parseInt(total[1], 10);
  const solo = cleaned.match(/solo:?\s*(\d+)/i);
  return solo ? parseInt(solo[1], 10) : null;
}

/**
 * Titan forms are NOT in the infobox — they live in {{Succession}} blocks
 * below it, one per inherited Titan, keyed by "Title link".
 */
/**
 * Titan forms are NOT in the infobox - they live in {{Succession}} blocks
 * below it. But {{Succession}} is also used for non-Titan lineages such as
 * Survey Corps commanders, which is why we filter on the `Group` parameter
 * ("Nine Titans"). Some pages omit Group, so a title ending in "Titan" is
 * accepted as a fallback.
 */
export function parseTitanForms(wikitext: string): string[] {
  const forms = findTemplates(wikitext, "Succession")
    .map((block) => templateToFields(block))
    .map((fields) => {
      const g = fieldGetter(fields);
      const group = cleanValue(g("group") ?? "");
      const title = cleanValue(g("title link") ?? g("title") ?? "");
      return { group, title };
    })
    .filter(({ group, title }) => {
      if (!title) return false;
      if (group) return /nine titans/i.test(group);
      return /\btitans?$/i.test(title); // no Group given - fall back to name
    })
    .map(({ title }) => title);

  return [...new Set(forms)];
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export interface ParsedCharacter {
  pageId: number;
  wikiTitle: string;
  name: string;
  kanji: string | null;
  romaji: string | null;
  aliases: string[];
  species: string[];
  gender: string | null;
  status: Status;
  heightCm: number | null;
  weightKg: number | null;
  birthday: string | null;
  birthplace: string | null;
  residence: string | null;
  occupation: string | null;
  formerOccupation: string | null;
  rank: string | null;
  formerRank: string | null;
  affiliations: string[];
  formerAffiliations: string[];
  gradRank: number | null;
  titanKillsTotal: number | null;
  isTitanShifter: boolean;
  titanForms: string[];
  debutChapter: string | null;
  voiceActorJp: string | null;
  isInAnime: boolean;
  rawInfobox: Record<string, string>;
}

const orNull = (raw?: string): string | null => {
  const cleaned = cleanValue(raw ?? "");
  return cleaned || null;
};

/* ------------------------------------------------------------------ */
/* Anime companion pages                                               */
/* ------------------------------------------------------------------ */

/**
 * The {{Media icons}} block links a character's other-media pages. `A` holds
 * the anime page title, which is NOT derivable from the main title:
 * "Eren Yeager" -> "Eren Jaeger (Anime)". Note the different surname spelling.
 *
 * A value of "#" means "this page is that version", so there is nothing extra
 * to fetch. An empty value means the character never appeared in that medium.
 */
export function animePageTitle(wikitext: string): string | null {
  const block = findTemplates(wikitext, "Media icons")[0];
  if (!block) return null;
  const value = (fieldGetter(templateToFields(block))("a") ?? "").trim();
  if (!value || value === "#") return null;
  return cleanValue(value) || null;
}

/**
 * Candidate key names for anime-only fields. The wiki is inconsistent, and I
 * have not verified these against a real (Anime) page - the parser returns
 * `unknownKeys` so the first run reveals the actual names in use.
 */
const VA_JP_KEYS = [
  "voice actor",
  "japanese voice actor",
  "voice actor (japanese)",
  "seiyu",
  "seiyuu",
];
const VA_EN_KEYS = [
  "english voice actor",
  "voice actor (english)",
  "english va",
  "dub voice actor",
  "english voice",
];
const EPISODE_KEYS = [
  "debut episode",
  "episode debut",
  "anime debut",
  "first appearance",
];

/** Returns the first non-empty value among several candidate key names. */
function firstOf(
  g: (name: string) => string | undefined,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = orNull(g(key));
    if (value) return value;
  }
  return null;
}

export interface ParsedAnimePage {
  voiceActorJp: string | null;
  voiceActorEn: string | null;
  debutEpisode: string | null;
  /** Infobox keys this parser ignored - inspect these on your first run. */
  unknownKeys: string[];
}

export function parseAnimePage(wikitext: string): ParsedAnimePage | null {
  const block = findTemplates(wikitext, "Infobox character")[0];
  if (!block) return null;

  const fields = templateToFields(block);
  const g = fieldGetter(fields);
  const consumed = new Set([...VA_JP_KEYS, ...VA_EN_KEYS, ...EPISODE_KEYS]);

  return {
    voiceActorJp: firstOf(g, VA_JP_KEYS),
    voiceActorEn: firstOf(g, VA_EN_KEYS),
    debutEpisode: firstOf(g, EPISODE_KEYS),
    unknownKeys: Object.keys(fields).filter(
      (k) => !consumed.has(k.toLowerCase().replace(/\s+/g, " ").trim()),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Sanity filter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Concept pages ("Pure Titan", "Titan") also use {{Infobox character}}, so the
 * presence of the template is not enough. Real people have at least one of
 * these personal attributes; concepts have none of them.
 */
export function looksLikePerson(c: ParsedCharacter): boolean {
  return Boolean(
    c.gender || c.heightCm || c.birthday || c.occupation || c.formerOccupation,
  );
}

export function parseCharacter(
  wikitext: string,
  meta: { pageId: number; title: string },
): ParsedCharacter | null {
  const infoboxBlock = findTemplates(wikitext, "Infobox character")[0];
  if (!infoboxBlock) return null; // not a character page

  const f = templateToFields(infoboxBlock);
  const g = fieldGetter(f); // case-insensitive lookup
  const species = cleanList(g("species") ?? "");
  const titanForms = parseTitanForms(wikitext);

  // {{Media icons}} has an `A` param pointing at the anime page.
  // Characters without it never appeared in the anime.
  const mediaIcons = findTemplates(wikitext, "Media icons")[0];
  const mediaFields = mediaIcons ? templateToFields(mediaIcons) : {};
  const animeEntry = (fieldGetter(mediaFields)("a") ?? "").trim();

  return {
    pageId: meta.pageId,
    wikiTitle: meta.title,
    name: meta.title,
    kanji: orNull(g("kanji")),
    romaji: orNull(g("romaji")),
    // Aliases arrive as {{nihongo|"Krista Lenz" (former)|...}}, so quotes can
    // sit mid-string rather than only at the ends. Strip them all.
    aliases: cleanList(g("alias") ?? "").map((a) =>
      a.replace(/["“”]/g, "").trim(),
    ),
    species,
    gender: orNull(g("gender")),
    status: normaliseStatus(g("status")),
    heightCm: parseHeightCm(g("height")),
    weightKg: parseWeightKg(g("weight")),
    birthday: orNull(g("birthday")),
    birthplace: orNull(g("birthplace")),
    residence: orNull(g("residence")),
    occupation: orNull(g("occupation")),
    formerOccupation: orNull(g("f. occupation")),
    rank: orNull(g("rank")),
    formerRank: orNull(g("f. rank")),
    affiliations: cleanList(g("affiliation") ?? ""),
    formerAffiliations: cleanList(g("f. affiliation") ?? ""),
    gradRank: parseOrdinal(g("grad rank")),
    titanKillsTotal: parseTitanKills(g("titan kills")),
    // The wiki is inconsistent about listing "Intelligent Titan" under Species
    // (Eren has it, Reiner and Zeke do not), so holding a Titan is the more
    // reliable signal. Keep species as a secondary check.
    isTitanShifter:
      titanForms.length > 0 ||
      species.some((s) => /intelligent titan|titan shifter/i.test(s)),
    titanForms,
    debutChapter: orNull(g("debut chapter")),
    voiceActorJp: orNull(g("voice actor")),
    isInAnime: animeEntry !== "" && animeEntry !== "#",
    rawInfobox: f,
  };
}
