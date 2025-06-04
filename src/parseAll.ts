import fs from "fs/promises";
import path from "path";
import puppeteer, { Page } from "puppeteer";


const getInn = async (i: number, page: Page, results: string[]) => {
  try {
      console.log(i);
      page.goto(`https://wildberries.ru/seller/${i}`);
      const res = await page.waitForResponse((r) =>
        r.url().includes("/data/supplier-by-id/")
      );
      const data: {
        supplierName: string;
        supplierFullName: string;
        inn: string;
        ogrnip: string;
        kpp: string;
        unp: string;
        bin: string;
        unn: string;
      } = await res.json();
      if (data.inn) results.push(data.inn);
    } catch (error) {}
}


(async () => {
  console.log("Starting to parse WB...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox", // (CAUTION: Security risk, use if truly needed)
      "--disable-setuid-sandbox",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--blink-settings=imagesEnabled=false", // disables images
    ],
  });
  let pages: Page[] = [
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage(),
    await browser.newPage()
  ];

  for (const page of pages) {
      await page.setViewport({
    width: 1920,
    height: 1080,
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
  );
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["image", "stylesheet", "font"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  }
  let results: string[] = [];
  let promises: (Promise<any> | undefined)[] = [];
  for (let i = 3277; i < 1000001; i++) {
    const pageIdx = i % 8;
    if (promises[pageIdx]) await promises[pageIdx];
    promises[pageIdx] = getInn(i, pages[pageIdx], results);

    if (i % 10 === 0) {
      await fs.writeFile(
        path.join(process.cwd(), "longParse.temp.json"),
        JSON.stringify(results),
        "utf-8"
      );
    }
  }

  await Promise.all(promises);
  await fs.writeFile(
    path.join(process.cwd(), "longParse.temp.json"),
    JSON.stringify(results),
    "utf-8"
  );
  await browser.close();
})();
