import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["Alive", "Deceased", "Unknown"]);

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().unique(), // 30294
  wikiTitle: text("wiki_title").notNull().unique(), // "Eren Yeager"
  name: text("name").notNull(),
  kanji: text("kanji"),
  romaji: text("romaji"),
  aliases: text("aliases").array(),
  species: text("species").array(), // ["Human", "Intelligent Titan"]
  gender: text("gender"),
  status: statusEnum("status"),
  heightCm: integer("height_cm"), // human form only
  weightKg: integer("weight_kg"),
  birthday: text("birthday"), // "March 30th" — not a real date
  birthplace: text("birthplace"),
  residence: text("residence"),
  // current vs former
  occupation: text("occupation"),
  formerOccupation: text("former_occupation"),
  rank: text("rank"),
  formerRank: text("former_rank"),
  affiliations: text("affiliations").array(),
  formerAffiliations: text("former_affiliations").array(),
  // military stats
  gradRank: integer("grad_rank"), // 5
  titanKillsTotal: integer("titan_kills_total"), // 23
  // titan powers (derived, not direct fields)
  isTitanShifter: boolean("is_titan_shifter").default(false),
  titanForms: text("titan_forms").array(), // ["Attack Titan", "Founding Titan", ...]
  // media
  debutChapter: text("debut_chapter"),
  debutEpisode: text("debut_episode"),
  voiceActorJp: text("voice_actor_jp"),
  voiceActorEn: text("voice_actor_en"),
  isInAnime: boolean("is_in_anime").default(false),
  imageUrl: text("image_url"),
  // escape hatch
  rawInfobox: jsonb("raw_infobox"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
});
