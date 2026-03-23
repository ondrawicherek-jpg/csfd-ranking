/**
 * ČSFD scraper (Playwright) — stáhne top filmy ze žebříčků.
 * Spusť: npm run scrape
 * Výstup: scripts/films.json
 */

import { chromium } from "playwright";
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeOnePage(
  page: import("playwright").Page,
  url: string,
  rankType: "best" | "popular",
  rankStart: number
): Promise<Film[]> {
  console.log(`   → ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(1500);

  const films = await page.evaluate(({ rankType, rankStart }: { rankType: string; rankStart: number }) => {
    const results: Film[] = [];
    const seen = new Set<string>();

    // Hlavní selektor pro film karty v žebříčku
    const articles = document.querySelectorAll("article.article-poster-60");

    articles.forEach((article, i) => {
      // Film URL — hledáme odkaz s /film/ID-
      const links = Array.from(article.querySelectorAll('a[href*="/film/"]'));
      let csfd_id = "";
      let slug = "";
      let csfd_url = "";

      for (const link of links) {
        const href = link.getAttribute("href") || "";
        const m = href.match(/\/film\/(\d+)-([^/?]+)/);
        if (m) {
          csfd_id = m[1];
          slug = m[2];
          csfd_url = `https://www.csfd.cz/film/${csfd_id}-${slug}/`;
          break;
        }
      }

      if (!csfd_id || seen.has(csfd_id)) return;
      seen.add(csfd_id);

      // Titulek — text odkazu s neprázdným textem
      let title = "";
      for (const link of links) {
        const t = link.textContent?.trim();
        if (t && t.length > 1 && !t.match(/^\d+$/)) {
          title = t;
          break;
        }
      }
      if (!title) title = slug.replace(/-/g, " ");

      // Rok — hledáme v textovém obsahu
      const text = article.textContent || "";
      const yearMatch = text.match(/\b(1[89]\d\d|20[012]\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;

      // Žánry — formát: "USA, Drama / Krimi" → vynechej země (velká písmena / zkratky), vezmi jen žánry za ","
      const originsEl = article.querySelector(".film-origins-genres .info");
      let genres: string[] = [];
      if (originsEl) {
        const parts = originsEl.textContent!.split(",").map((s: string) => s.trim()).filter(Boolean);
        // První část je "USA" (nebo více zemí) — ostatní jsou žánry oddělené " / "
        const genrePart = parts.slice(1).join(", ");
        genres = genrePart.split(/[/,]/).map((g: string) => g.trim()).filter(Boolean);
      }

      // Hodnocení ČSFD — třída "rating-average" obsahuje "95,4%"
      const ratingEl = article.querySelector(".rating-average");
      const ratingText = ratingEl?.textContent?.trim() || "";
      const ratingMatch = ratingText.match(/(\d{1,3})/);
      const csfd_rating = ratingMatch ? parseInt(ratingMatch[1]) : null;

      // Obrázek
      const img = article.querySelector("img");
      const raw_image = img?.getAttribute("src") || img?.getAttribute("data-src") || null;
      const image_url = raw_image && !raw_image.startsWith("data:") ? raw_image : null;

      results.push({
        csfd_id,
        title: title.trim(),
        title_original: null,
        year,
        genres,
        csfd_rating,
        image_url,
        csfd_url,
        rank_position: rankStart + i,
        rank_type: rankType,
      } as Film);
    });

    return results;
  }, { rankType, rankStart });

  console.log(`     Nalezeno: ${films.length} filmů`);
  return films as Film[];
}

// Pomocný typ (kvůli TypeScript v page.evaluate)
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
  rank_type: string;
}

async function scrapeRanking(
  page: import("playwright").Page,
  rankType: "best" | "popular",
  target: number
): Promise<Film[]> {
  const baseUrl =
    rankType === "best"
      ? "https://www.csfd.cz/zebricky/filmy/nejlepsi/"
      : "https://www.csfd.cz/zebricky/filmy/nejoblibenejsi/";

  const allFilms: Film[] = [];
  const seen = new Set<string>();

  console.log(`\n📋 ${rankType === "best" ? "Nejlepší" : "Nejoblíbenější"} filmy (cíl: ${target})`);

  for (let from = 0; from < target; from += 100) {
    const url = from === 0 ? baseUrl : `${baseUrl}?from=${from}`;
    const films = await scrapeOnePage(page, url, rankType, allFilms.length + 1);

    if (films.length === 0) {
      console.log("   Žádné další filmy, končím.");
      break;
    }

    let added = 0;
    for (const f of films) {
      if (!seen.has(f.csfd_id)) {
        seen.add(f.csfd_id);
        allFilms.push({ ...f, rank_position: allFilms.length + 1 });
        added++;
      }
    }
    console.log(`     Přidáno: ${added} nových (celkem: ${allFilms.length})`);

    if (allFilms.length >= target) break;
    await sleep(1000);
  }

  return allFilms;
}

async function main() {
  console.log("🎬 ČSFD Scraper — spouštím...\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--lang=cs"],
  });
  const context = await browser.newContext({
    locale: "cs-CZ",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Inicializuj session
    await page.goto("https://www.csfd.cz/", { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(1000);

    const bestFilms = await scrapeRanking(page, "best", 1000);
    await sleep(2000);
    const popularFilms = await scrapeRanking(page, "popular", 1000);

    // Merge — best má přednost
    const byId = new Map<string, Film>();
    for (const f of bestFilms) byId.set(f.csfd_id, f);
    for (const f of popularFilms) {
      if (!byId.has(f.csfd_id)) byId.set(f.csfd_id, f);
    }

    const allFilms = Array.from(byId.values());
    console.log(`\n✅ Unikátní filmy: ${allFilms.length} (best: ${bestFilms.length}, popular only: ${allFilms.length - bestFilms.length})`);

    const out = path.join(__dirname, "films.json");
    fs.writeFileSync(out, JSON.stringify(allFilms, null, 2), "utf-8");
    console.log(`💾 Uloženo: ${out}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
