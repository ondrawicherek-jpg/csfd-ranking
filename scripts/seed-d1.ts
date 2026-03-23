/**
 * Seeds Cloudflare D1 (remote) with films from scripts/films.json.
 * Uses wrangler d1 execute with batched INSERT statements.
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const FILMS_PATH = path.join(__dirname, "films.json");
const DB_NAME = "csfd-ranking-db";
const BATCH_SIZE = 50;

const films = JSON.parse(fs.readFileSync(FILMS_PATH, "utf-8"));
console.log(`📦 Seeding ${films.length} films to D1 (${DB_NAME})...`);

function escape(s: string | null): string {
  if (s === null || s === undefined) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

let total = 0;
for (let i = 0; i < films.length; i += BATCH_SIZE) {
  const batch = films.slice(i, i + BATCH_SIZE);
  const values = batch.map((f: {
    csfd_id: string; title: string; title_original: string | null;
    year: number | null; genres: string[]; csfd_rating: number | null;
    image_url: string | null; csfd_url: string; rank_position: number; rank_type: string;
  }) =>
    `(${escape(f.csfd_id)},${escape(f.title)},${escape(f.title_original)},` +
    `${f.year ?? "NULL"},${escape(JSON.stringify(f.genres ?? []))},` +
    `${f.csfd_rating ?? "NULL"},${escape(f.image_url)},${escape(f.csfd_url)},` +
    `${f.rank_position},${escape(f.rank_type)})`
  ).join(",\n");

  const sql = `INSERT OR REPLACE INTO films (csfd_id,title,title_original,year,genres,csfd_rating,image_url,csfd_url,rank_position,rank_type) VALUES ${values};`;

  // Write to temp file (avoid shell escaping issues)
  const tmpFile = path.join(__dirname, `_seed_batch_${i}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf-8");

  try {
    execSync(`npx wrangler d1 execute csfd-ranking-db --remote --file="${tmpFile}"`, {
      stdio: "pipe",
      cwd: path.join(__dirname, ".."),
    });
    total += batch.length;
    process.stdout.write(`\r  ${total}/${films.length} films...`);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

console.log(`\n✅ Done — ${total} films seeded to D1.`);
