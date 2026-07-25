import { db, pool } from "../db";
import { characters } from "../db/schema";

const main = async () => {
  await db.delete(characters);
  console.log("characters table emptied");
  await pool.end();
};

main();
