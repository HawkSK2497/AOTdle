/**
 * One-command setup for a fresh clone.
 *
 *   npm run setup                  # interactive
 *   npm run setup -- --yes         # no prompts
 *   npm run setup -- --skip-scrape # schema only, no network calls
 *
 * Deliberately does NOT import the database module. Everything that touches
 * Postgres runs as a subprocess, so a missing or invalid .env surfaces as a
 * readable message here rather than a stack trace thrown at import time.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const AUTO_YES = args.includes("--yes");
const SKIP_SCRAPE = args.includes("--skip-scrape");

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const step = (n: number, total: number, label: string) => {
  console.log(`\n${bold(`[${n}/${total}]`)} ${label}`);
};

const fail = (message: string, hint?: string): never => {
  console.error(`\n${red("✗")} ${message}`);
  if (hint) console.error(dim(`  ${hint}`));
  process.exit(1);
};

const confirm = async (question: string): Promise<boolean> => {
  if (AUTO_YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return answer.trim().toLowerCase().startsWith("y");
};

const printNextSteps = () => {
  console.log(bold("\nSetup complete.\n"));
  console.log("  npm run dev        start the frontend");
  console.log("  npm run api        start the API server");
  console.log("  npm run db:studio  browse the database");
  console.log("");
};

const main = async () => {
  const TOTAL = SKIP_SCRAPE ? 2 : 3;
  console.log(bold("\nAOT character database setup"));

  /* 1. Environment ---------------------------------------------------- */

  step(1, TOTAL, "Checking environment");

  if (!existsSync(".env")) {
    fail(
      "No .env file found.",
      "Copy .env.example to .env and add your Postgres connection string.\n" +
        "  Free databases: https://neon.tech or https://supabase.com",
    );
  }
  console.log(`${green("✓")} .env found`);

  /* 2. Schema --------------------------------------------------------- */

  step(2, TOTAL, "Creating tables");
  console.log(dim("Connecting to Postgres and applying the schema...\n"));

  try {
    // This is also the connection test: drizzle-kit fails loudly here if
    // DATABASE_URL is missing, malformed, or unreachable.
    // --force skips the confirmation prompt for potentially destructive
    // statements, which is right for a script but means it will not stop to
    // warn you when run against a database that already has data.
    execSync("drizzle-kit push --force", { stdio: "inherit" });
    console.log(`\n${green("✓")} schema applied`);
  } catch {
    fail(
      "Could not apply the schema.",
      "Usually a bad DATABASE_URL. Hosted databases need ?sslmode=require\n" +
        "  Run `npm run db:push` directly to see the full error.",
    );
  }

  if (SKIP_SCRAPE) {
    console.log(dim("\nSkipping the scrape (--skip-scrape)."));
    console.log(`Run ${bold("npm run db:scrape")} when you are ready.`);
    return;
  }

  /* 3. Data ----------------------------------------------------------- */

  step(3, TOTAL, "Populating characters");
  console.log(
    dim(
      "Scrapes ~213 pages from the Attack on Titan wiki at 1 request/sec,\n" +
        "which takes about 10 minutes. Rows are upserted, so this is safe to\n" +
        "run again later and safe to interrupt.\n",
    ),
  );

  const populate = await confirm("Scrape the wiki now?");
  if (!populate) {
    console.log(dim("Skipped."));
    console.log(`Run ${bold("npm run db:scrape")} when you are ready.`);
    return;
  }

  try {
    execSync("tsx server/scripts/ingest.ts", { stdio: "inherit" });
  } catch {
    fail(
      "The scrape failed or was interrupted.",
      "Re-run `npm run db:scrape` - it upserts, so no progress is lost.",
    );
  }

  printNextSteps();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
