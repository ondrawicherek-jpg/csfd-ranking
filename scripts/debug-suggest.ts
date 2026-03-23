import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "cs-CZ",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const apiRequests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.includes("pmgstatic") && !url.includes(".css") && !url.includes(".js") && !url.includes(".png") && !url.includes(".svg")) {
      apiRequests.push(`${req.method()} ${url}`);
    }
  });

  await page.goto("https://www.csfd.cz/hledat/?q=matilda", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  console.log("All non-asset requests:");
  apiRequests.forEach(r => console.log(r));
  await browser.close();
}

main().catch(console.error);
