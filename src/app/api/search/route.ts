import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getTokenFromRequest } from "@/lib/auth";
import { searchFilms, insertFilm } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });
  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ films: [] });

  const db = await getDB();

  // Search local DB first
  const localFilms = await searchFilms(db, q, 20);
  if (localFilms.length > 0) return NextResponse.json({ films: localFilms, source: "local" });

  // Fallback: Playwright scrape — only in local dev (not available on Cloudflare)
  if (process.env.NODE_ENV === "development") {
    try {
      const scraped = await scrapeCsfdSearch(q);
      if (scraped.length > 0) {
        const saved = [];
        for (const film of scraped) {
          const id = await insertFilm(db, film);
          saved.push({ ...film, id });
        }
        return NextResponse.json({ films: saved, source: "csfd" });
      }
    } catch (err) {
      console.error("ČSFD search error:", err);
    }
  }

  return NextResponse.json({ films: [] });
}

async function scrapeCsfdSearch(query: string): Promise<Omit<import("@/lib/db").Film, "id">[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "cs-CZ",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(`https://www.csfd.cz/hledat/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Search results use article.article-poster-50 (ranking pages use article-poster-60)
    const films = await page.evaluate(() => {
      const results: Array<{
        csfd_id: string; title: string; title_original: string | null;
        year: number | null; genres: string[]; csfd_rating: number | null;
        image_url: string | null; csfd_url: string;
      }> = [];
      const seen = new Set<string>();

      document.querySelectorAll("article.article-poster-50").forEach((article) => {
        const link = article.querySelector("a[href*='/film/']");
        const href = link?.getAttribute("href") || "";
        const m = href.match(/\/film\/(\d+)-([^/?]+)/);
        if (!m) return;
        const csfd_id = m[1];
        if (seen.has(csfd_id)) return;
        seen.add(csfd_id);

        const titleEl = article.querySelector(".film-title-name, h3 a, h2 a");
        const title = titleEl?.textContent?.trim() || m[2].replace(/-/g, " ");

        const yearEl = article.querySelector(".film-title-info .info");
        const yearM = yearEl?.textContent?.match(/(\d{4})/);
        const year = yearM ? parseInt(yearM[1]) : null;

        const originsEl = article.querySelector(".film-origins-genres .info");
        let genres: string[] = [];
        if (originsEl) {
          const parts = originsEl.textContent!.split(",").map(s => s.trim()).filter(Boolean);
          const genrePart = parts.slice(1).join(", ");
          genres = genrePart.split(/[/,]/).map(g => g.trim()).filter(Boolean);
        }

        const ratingEl = article.querySelector(".rating-average");
        const ratingM = ratingEl?.textContent?.trim().match(/(\d{1,3})/);
        const csfd_rating = ratingM ? parseInt(ratingM[1]) : null;

        const img = article.querySelector("img");
        const raw_image = img?.getAttribute("src") || img?.getAttribute("data-src") || null;
        const image_url = raw_image && !raw_image.startsWith("data:") ? raw_image : null;

        results.push({
          csfd_id, title, title_original: null, year, genres,
          csfd_rating, image_url,
          csfd_url: `https://www.csfd.cz${href.split("?")[0]}`,
        });
      });

      return results.slice(0, 12);
    });

    return films.map(f => ({ ...f, rank_position: 9999, rank_type: "search" }));
  } finally {
    await browser.close();
  }
}
