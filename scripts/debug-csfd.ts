import { chromium } from "playwright";

async function getFilmIds(page: import("playwright").Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 2000));
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("article.article-poster-60 a[href*='/film/']"))
      .map(a => a.getAttribute("href"))
      .filter((h, i, arr) => h && arr.indexOf(h) === i)
      .slice(0, 5)
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "cs-CZ",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const p1 = await getFilmIds(page, "https://www.csfd.cz/zebricky/filmy/nejlepsi/");
  console.log("Page 1:", p1);

  const p2 = await getFilmIds(page, "https://www.csfd.cz/zebricky/filmy/nejlepsi/?from=100");
  console.log("Page 2 (?from=100):", p2);

  const p3 = await getFilmIds(page, "https://www.csfd.cz/zebricky/filmy/nejlepsi/?from=200");
  console.log("Page 3 (?from=200):", p3);

  console.log("\nPage 1 == Page 2:", JSON.stringify(p1) === JSON.stringify(p2));

  // Check if it's a React/SPA navigation
  const currentUrl = page.url();
  console.log("Current URL after navigation:", currentUrl);

  await browser.close();
}

main().catch(console.error);
