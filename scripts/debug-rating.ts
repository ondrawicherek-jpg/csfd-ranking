import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "cs-CZ",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.goto("https://www.csfd.cz/zebricky/filmy/nejlepsi/", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 2000));

  const html = await page.evaluate(() => {
    const article = document.querySelector("article.article-poster-60");
    return article?.innerHTML?.substring(0, 3000) || "not found";
  });
  console.log(html);

  await browser.close();
}

main().catch(console.error);
