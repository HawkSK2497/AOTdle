import { db } from "../db";
import { sql } from "drizzle-orm";

const main = async () => {
  const result = await db.execute(sql` select now()`);
  console.log("Connected!", result.rows[0]);
  process.exit(0);
};

main();
