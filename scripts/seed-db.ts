/**
 * Seeds the local SQLite DB with films from scripts/films.json.
 * Run: npm run seed
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(__dirname, "..", ".local-db", "csfd.sqlite");
const FILMS_PATH = path.join(__dirname, "films.json");

const films = JSON.parse(fs.readFileSync(FILMS_PATH, "utf-8"));

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const insert = db.prepare(`
  INSERT INTO films (csfd_id, title, title_original, year, genres, csfd_rating, image_url, csfd_url, rank_position, rank_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(csfd_id) DO UPDATE SET
    title = excluded.title,
    title_original = excluded.title_original,
    year = excluded.year,
    genres = excluded.genres,
    csfd_rating = excluded.csfd_rating,
    image_url = excluded.image_url,
    csfd_url = excluded.csfd_url,
    rank_position = excluded.rank_position,
    rank_type = excluded.rank_type
`);

const insertMany = db.transaction((films: typeof films) => {
  for (const f of films) {
    insert.run(
      f.csfd_id,
      f.title,
      f.title_original ?? null,
      f.year ?? null,
      JSON.stringify(f.genres ?? []),
      f.csfd_rating ?? null,
      f.image_url ?? null,
      f.csfd_url,
      f.rank_position,
      f.rank_type
    );
  }
});

insertMany(films);
console.log(`✅ Seeded ${films.length} films into ${DB_PATH}`);
db.close();
