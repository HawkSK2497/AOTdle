/**
 * Scrapes every character from the Attack on Titan wiki into Postgres.
 *
 *   npx tsx server/scripts/ingest.ts --limit 10   # trial run, 10 characters
 *   npx tsx server/scripts/ingest.ts              # full run
 *
 * Each character costs two requests (main page + anime page) plus a shared
 * batched request for images, throttled to roughly one per second.
 */

import { db, pool } from "../db";
import { characters } from "../db/schema";
import {
  parseCharacter,
  parseAnimePage,
  animePageTitle,
  looksLikePerson,
} from "../lib/parse-wikitext";

const BASE = "https://attackontitan.fandom.com/api.php";
const HEADERS = {
  "User-Agent": "AOTGuessGame/1.0 (your-email@example.com)",
};
const DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every API call goes through here so throttling is impossible to forget. */
const api = async (params: Record<string, string>): Promise<any> => {
  const url = new URL(BASE);
  url.search = new URLSearchParams({ format: "json", ...params }).toString();

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);

  await sleep(DELAY_MS);
  return res.json();
};

/* ------------------------------------------------------------------ */
/* Step 1: list every character page                                   */
/* ------------------------------------------------------------------ */

const getAllCharacterTitles = async (): Promise<string[]> => {
  const titles: string[] = [];
  let cmcontinue: string | undefined;

  do {
    const data = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:Characters",
      cmlimit: "500",
      cmnamespace: "0", // articles only, skip File:/Category:/Template:
      ...(cmcontinue ? { cmcontinue } : {}),
    });

    for (const member of data.query.categorymembers ?? []) {
      titles.push(member.title);
    }
    cmcontinue = data.continue?.cmcontinue;
    process.stdout.write(`\r  found ${titles.length} pages`);
  } while (cmcontinue);

  process.stdout.write("\n");
  return titles;
};

/* ------------------------------------------------------------------ */
/* Step 2: fetch one page's wikitext                                   */
/* ------------------------------------------------------------------ */

const fetchWikitext = async (title: string) => {
  const data = await api({
    action: "parse",
    page: title,
    prop: "wikitext",
    redirects: "1",
  });

  if (data.error) return null; // page missing or is a redirect loop

  return {
    pageId: data.parse.pageid as number,
    title: data.parse.title as string,
    wikitext: data.parse.wikitext["*"] as string,
  };
};

/* ------------------------------------------------------------------ */
/* Step 3: images, batched 50 titles at a time                         */
/* ------------------------------------------------------------------ */

const fetchImages = async (titles: string[]): Promise<Map<string, string>> => {
  const images = new Map<string, string>();

  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await api({
      action: "query",
      prop: "pageimages",
      piprop: "original",
      pilimit: "50",
      titles: batch.join("|"),
    });

    const pages = data.query?.pages ?? {};
    for (const page of Object.values<any>(pages)) {
      const src = page.original?.source;
      if (src) images.set(page.title, src);
    }
  }

  return images;
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const main = async () => {
  const limitArg = process.argv.indexOf("--limit");
  const limit =
    limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

  console.log("Listing characters...");
  let titles = await getAllCharacterTitles();
  if (limit !== Infinity) titles = titles.slice(0, limit);
  console.log(`Processing ${titles.length} pages\n`);

  const skipped: string[] = [];
  const failed: { title: string; reason: string }[] = [];
  const unknownAnimeKeys = new Set<string>();
  const rows: (typeof characters.$inferInsert)[] = [];

  for (const [index, title] of titles.entries()) {
    const progress = `[${index + 1}/${titles.length}]`;

    try {
      const page = await fetchWikitext(title);
      if (!page) {
        failed.push({ title, reason: "page not found" });
        continue;
      }

      const parsed = parseCharacter(page.wikitext, page);
      if (!parsed) {
        skipped.push(`${title} (no character infobox)`);
        console.log(`${progress} skip  ${title}`);
        continue;
      }
      if (!looksLikePerson(parsed)) {
        skipped.push(`${title} (concept page)`);
        console.log(`${progress} skip  ${title} - looks like a concept page`);
        continue;
      }

      // Second pass: the anime companion page, if one exists.
      let voiceActorJp = parsed.voiceActorJp;
      let voiceActorEn: string | null = null;
      let debutEpisode: string | null = null;

      const animeTitle = animePageTitle(page.wikitext);
      if (animeTitle) {
        const animePage = await fetchWikitext(animeTitle);
        const anime = animePage ? parseAnimePage(animePage.wikitext) : null;
        if (anime) {
          voiceActorJp = anime.voiceActorJp ?? voiceActorJp;
          voiceActorEn = anime.voiceActorEn;
          debutEpisode = anime.debutEpisode;
          anime.unknownKeys.forEach((k) => unknownAnimeKeys.add(k));
        }
      }

      rows.push({
        pageId: parsed.pageId,
        wikiTitle: parsed.wikiTitle,
        name: parsed.name,
        kanji: parsed.kanji,
        romaji: parsed.romaji,
        aliases: parsed.aliases,
        species: parsed.species,
        gender: parsed.gender,
        status: parsed.status,
        heightCm: parsed.heightCm,
        weightKg: parsed.weightKg,
        birthday: parsed.birthday,
        birthplace: parsed.birthplace,
        residence: parsed.residence,
        occupation: parsed.occupation,
        formerOccupation: parsed.formerOccupation,
        rank: parsed.rank,
        formerRank: parsed.formerRank,
        affiliations: parsed.affiliations,
        formerAffiliations: parsed.formerAffiliations,
        gradRank: parsed.gradRank,
        titanKillsTotal: parsed.titanKillsTotal,
        isTitanShifter: parsed.isTitanShifter,
        titanForms: parsed.titanForms,
        debutChapter: parsed.debutChapter,
        debutEpisode,
        voiceActorJp,
        voiceActorEn,
        isInAnime: parsed.isInAnime,
        rawInfobox: parsed.rawInfobox,
      });

      console.log(
        `${progress} ok    ${title}` +
          (parsed.isTitanShifter ? ` [${parsed.titanForms.join(", ")}]` : ""),
      );
    } catch (err) {
      failed.push({ title, reason: String(err) });
      console.log(`${progress} FAIL  ${title}: ${err}`);
    }
  }

  /* Images, batched -------------------------------------------------- */

  console.log("\nFetching images...");
  const images = await fetchImages(rows.map((r) => r.wikiTitle!));
  for (const row of rows) {
    row.imageUrl = images.get(row.wikiTitle!) ?? null;
  }

  /* Write ------------------------------------------------------------ */

  console.log(`\nWriting ${rows.length} rows...`);
  for (const row of rows) {
    await db
      .insert(characters)
      .values(row)
      .onConflictDoUpdate({
        target: characters.pageId,
        set: { ...row, scrapedAt: new Date() },
      });
  }

  /* Report ----------------------------------------------------------- */

  console.log("\n" + "=".repeat(60));
  console.log(`inserted/updated: ${rows.length}`);
  console.log(`with image:       ${rows.filter((r) => r.imageUrl).length}`);
  console.log(`with height:      ${rows.filter((r) => r.heightCm).length}`);
  console.log(`with episode:     ${rows.filter((r) => r.debutEpisode).length}`);
  console.log(`with EN voice:    ${rows.filter((r) => r.voiceActorEn).length}`);
  console.log(
    `shifters:         ${rows.filter((r) => r.isTitanShifter).length}`,
  );
  console.log(`skipped:          ${skipped.length}`);
  console.log(`failed:           ${failed.length}`);

  if (skipped.length) console.log("\nskipped:\n  " + skipped.join("\n  "));
  if (failed.length) {
    console.log(
      "\nfailed:\n  " +
        failed.map((f) => `${f.title}: ${f.reason}`).join("\n  "),
    );
  }
  if (unknownAnimeKeys.size) {
    // These are the real field names on (Anime) pages. If voiceActorEn or
    // debutEpisode came back empty, the correct key is almost certainly here.
    console.log("\nunrecognised anime infobox keys:");
    console.log("  " + [...unknownAnimeKeys].sort().join("\n  "));
  }

  await pool.end();
};

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
