/**
 * Fetches a handful of deliberately varied characters and reports how well
 * the parser handled each one. Run this BEFORE the full scrape.
 *
 *   npx tsx server/scripts/test-parse.ts
 */

import { parseCharacter, findTemplates } from "../lib/parse-wikitext";

const BASE = "https://attackontitan.fandom.com/api.php";
const HEADERS = {
  "User-Agent": "AOTGuessGame/1.0 (your-email@example.com)",
};

/**
 * Chosen to stress different shapes:
 *   Levi          - hugely popular, no Titan form, short human height
 *   Historia      - royalty, well-known alias (Krista Lenz)
 *   Reiner        - Titan shifter who is still alive
 *   Zeke          - Titan shifter, Marleyan side
 *   Hannes        - minor character, likely sparse infobox
 *   Sasha         - deceased, mid-tier page
 *   Ymir Fritz    - ancient/mythical, page structure often differs
 *   Pure Titan    - NOT a character; should be skipped cleanly
 */
const TEST_PAGES = [
  "Levi Ackerman",
  "Historia Reiss",
  "Reiner Braun",
  "Zeke Yeager",
  "Hannes",
  "Sasha Blouse",
  "Ymir Fritz",
  "Pure Titan",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitext(title: string) {
  const url = new URL(BASE);
  url.search = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "wikitext",
    format: "json",
    redirects: "1",
  }).toString();

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);

  const data = await res.json();
  if (data.error) return null; // page does not exist

  return {
    pageId: data.parse.pageid as number,
    title: data.parse.title as string,
    wikitext: data.parse.wikitext["*"] as string,
  };
}

/** Fields that being null is a red flag for, per character. */
const KEY_FIELDS = ["status", "heightCm", "affiliations", "formerAffiliations"];

async function main() {
  for (const page of TEST_PAGES) {
    console.log("\n" + "=".repeat(60));
    console.log(page);
    console.log("=".repeat(60));

    const fetched = await fetchWikitext(page);
    if (!fetched) {
      console.log("  page not found");
      await sleep(1000);
      continue;
    }

    const parsed = parseCharacter(fetched.wikitext, fetched);

    if (!parsed) {
      // Not necessarily a bug - could legitimately be a non-character page.
      // Print which infobox it DOES use so you know what you are missing.
      const templates = [
        ...fetched.wikitext.matchAll(/\{\{\s*(Infobox[^|\n}]*)/gi),
      ].map((m) => m[1].trim());
      console.log("  no {{Infobox character}}");
      console.log("  infoboxes present:", templates.join(", ") || "(none)");
      await sleep(1000);
      continue;
    }

    const { rawInfobox, ...fields } = parsed;

    console.log("  status:      ", fields.status);
    console.log("  heightCm:    ", fields.heightCm);
    console.log("  species:     ", fields.species.join(" / ") || "-");
    console.log("  occupation:  ", fields.occupation ?? "-");
    console.log("  formerOcc:   ", fields.formerOccupation ?? "-");
    console.log("  affiliations:", fields.affiliations.join(" / ") || "-");
    console.log(
      "  formerAffil: ",
      fields.formerAffiliations.join(" / ") || "-",
    );
    console.log("  shifter:     ", fields.isTitanShifter);
    console.log("  titanForms:  ", fields.titanForms.join(" / ") || "-");
    console.log("  aliases:     ", fields.aliases.join(" / ") || "-");
    console.log("  debut:       ", fields.debutChapter ?? "-");
    console.log("  VA (jp):     ", fields.voiceActorJp ?? "-");
    console.log("  in anime:    ", fields.isInAnime);

    // Flag suspicious results
    const missing = KEY_FIELDS.filter((k) => {
      const v = (fields as Record<string, unknown>)[k];
      return v === null || v === undefined || (Array.isArray(v) && !v.length);
    });
    if (missing.length) {
      console.log("  !! empty:", missing.join(", "));
    }

    // Any value still containing markup means the cleaner missed a template
    const dirty = Object.entries(fields).filter(([, v]) =>
      typeof v === "string" ? /[{}\[\]]|<br/i.test(v) : false,
    );
    if (dirty.length) {
      console.log("  !! UNCLEANED MARKUP:", JSON.stringify(dirty));
    }

    // Show infobox keys we are not reading at all - free feature ideas
    const known = new Set([
      "Image 1",
      "Image 2",
      "Image 3",
      "Image 4",
      "Image 5",
      "Image 6",
      "Kanji",
      "Romaji",
      "Alias",
      "Other spellings",
      "Species",
      "Gender",
      "Height",
      "Weight",
      "Relatives",
      "Birthday",
      "Birthplace",
      "Residence",
      "Status",
      "Occupation",
      "Rank",
      "Affiliation",
      "F. Occupation",
      "F. Rank",
      "F. Affiliation",
      "Grad rank",
      "Grade",
      "Titan kills",
      "Debut chapter",
      "Voice actor",
    ]);
    const unused = Object.keys(rawInfobox).filter((k) => !known.has(k));
    if (unused.length) console.log("  unused fields:", unused.join(", "));

    await sleep(1000); // be polite to Fandom
  }

  console.log("\ndone");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
