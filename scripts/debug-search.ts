import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "cs-CZ",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.goto("https://www.csfd.cz/hledat/?q=matilda", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    // Find parent article of first film link
    const link = document.querySelector("a.film-title-nooverflow, .film-title-nooverflow a");
    const art = link?.closest("article");
    return {
      articleClass: art?.className,
      html: art?.innerHTML?.slice(0, 1000),
    };
  });
  console.log("Article class:", result.articleClass);
  console.log("HTML:", result.html);

  await browser.close();
}

main().catch(console.error);
