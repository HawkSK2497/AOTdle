/**
 * Compares the wiki's character category against what actually landed in
 * Postgres, then explains each gap.
 *
 *   npx tsx server/scripts/audit.ts
 */

import { db, pool } from "../db";
import { characters } from "../db/schema";
import { parseCharacter, looksLikePerson } from "../lib/parse-wikitext";

const BASE = "https://attackontitan.fandom.com/api.php";
const HEADERS = { "User-Agent": "AOTGuessGame/1.0 (your-email@example.com)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = new URL(BASE);
  url.search = new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await sleep(1000);
  return res.json();
}

async function getAllCharacterTitles(): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined;
  do {
    const data = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:Characters",
      cmlimit: "500",
      cmnamespace: "0",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data.query.categorymembers ?? []) titles.push(m.title);
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

async function main() {
  const wikiTitles = await getAllCharacterTitles();

  const rows = await db
    .select({ pageId: characters.pageId, wikiTitle: characters.wikiTitle })
    .from(characters);

  const storedTitles = new Set(rows.map((r) => r.wikiTitle));
  const storedIds = new Set(rows.map((r) => r.pageId));

  console.log(`category pages: ${wikiTitles.length}`);
  console.log(`rows in db:     ${rows.length}`);

  const missing = wikiTitles.filter((t) => !storedTitles.has(t));
  console.log(`unaccounted:    ${missing.length}\n`);

  const reasons: Record<string, string[]> = {
    "redirects to a page already stored": [],
    "no {{Infobox character}}": [],
    "concept page (no personal attributes)": [],
    "fetch failed": [],
    "UNEXPLAINED - investigate": [],
  };

  for (const title of missing) {
    try {
      const data = await api({
        action: "parse",
        page: title,
        prop: "wikitext",
        redirects: "1",
      });

      if (data.error) {
        reasons["fetch failed"].push(title);
        continue;
      }

      const page = {
        pageId: data.parse.pageid as number,
        title: data.parse.title as string,
        wikitext: data.parse.wikitext["*"] as string,
      };

      // A redirect: the category lists one title, but it resolves to a page
      // already stored under a different name. Upserting on pageId means the
      // second title never produced its own row - which is correct.
      if (storedIds.has(page.pageId)) {
        reasons["redirects to a page already stored"].push(
          `${title} -> ${page.title}`,
        );
        continue;
      }

      const parsed = parseCharacter(page.wikitext, page);
      if (!parsed) {
        const boxes = [
          ...page.wikitext.matchAll(/\{\{\s*(Infobox[^|\n}]*)/gi),
        ].map((m) => m[1].trim());
        reasons["no {{Infobox character}}"].push(
          `${title} (uses: ${boxes.join(", ") || "none"})`,
        );
        continue;
      }

      if (!looksLikePerson(parsed)) {
        reasons["concept page (no personal attributes)"].push(title);
        continue;
      }

      reasons["UNEXPLAINED - investigate"].push(title);
    } catch (err) {
      reasons["fetch failed"].push(`${title}: ${err}`);
    }
  }

  for (const [reason, titles] of Object.entries(reasons)) {
    if (!titles.length) continue;
    console.log(`${reason} (${titles.length}):`);
    for (const t of titles) console.log(`  ${t}`);
    console.log();
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
