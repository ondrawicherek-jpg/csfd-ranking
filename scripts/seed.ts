/**
 * Seed skript — naplní D1 databázi filmy ze scripts/films.json
 * Spusť: npm run seed (po npm run scrape)
 *
 * Používá Wrangler REST API nebo přímý SQL přes stdin.
 * Pro lokální dev: wrangler d1 execute csfd-ranking-db --local --file=scripts/seed.sql
 */

import * as fs from "fs";
import * as path from "path";

interface Film {
  csfd_id: string;
  title: string;
  title_original: string | null;
  year: number | null;
  genres: string[];
  csfd_rating: number | null;
  image_url: string | null;
  csfd_url: string;
  rank_position: number;
  rank_type: "best" | "popular";
}

function escapeSQL(str: string | null): string {
  if (str === null) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

function main() {
  const filmsPath = path.join(__dirname, "films.json");

  if (!fs.existsSync(filmsPath)) {
    console.error("❌ films.json nenalezen. Nejprve spusť: npm run scrape");
    process.exit(1);
  }

  const films: Film[] = JSON.parse(fs.readFileSync(filmsPath, "utf-8"));
  console.log(`📂 Načteno ${films.length} filmů z films.json`);

  const lines: string[] = [];
  lines.push("-- Auto-generovaný seed soubor ze scripts/seed.ts");
  lines.push("-- Spusť: wrangler d1 execute csfd-ranking-db --local --file=scripts/seed.sql");
  lines.push("");
  lines.push("BEGIN TRANSACTION;");
  lines.push("");

  // Batch INSERT po 100 filmech
  const batchSize = 100;
  for (let i = 0; i < films.length; i += batchSize) {
    const batch = films.slice(i, i + batchSize);
    const values = batch.map((f) => {
      const genres = escapeSQL(JSON.stringify(f.genres));
      return `(${escapeSQL(f.csfd_id)}, ${escapeSQL(f.title)}, ${escapeSQL(f.title_original)}, ${f.year ?? "NULL"}, ${genres}, ${f.csfd_rating ?? "NULL"}, ${escapeSQL(f.image_url)}, ${escapeSQL(f.csfd_url)}, ${f.rank_position}, ${escapeSQL(f.rank_type)})`;
    });

    lines.push(
      `INSERT OR IGNORE INTO films (csfd_id, title, title_original, year, genres, csfd_rating, image_url, csfd_url, rank_position, rank_type) VALUES`
    );
    lines.push(values.join(",\n") + ";");
    lines.push("");
  }

  lines.push("COMMIT;");

  const outputPath = path.join(__dirname, "seed.sql");
  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`✅ Seed SQL uložen do: ${outputPath}`);
  console.log(`\nNyní spusť:`);
  console.log(`  wrangler d1 execute csfd-ranking-db --local --file=scripts/seed.sql`);
  console.log(`  nebo pro produkci:`);
  console.log(`  wrangler d1 execute csfd-ranking-db --file=scripts/seed.sql`);
}

main();
