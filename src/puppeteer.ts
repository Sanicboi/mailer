import puppeteer, { ElementHandle, HTTPRequest } from "puppeteer";
import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import fs from "fs/promises";
import path from "path";

(async () => {
  console.log("Парсер вб продавцов v1.0 запускается...");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
  });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
  );

  console.log("Читаю файл с пользователями...");
  let preprocessed: {
    phone: string;
    id: string;
    username?: string;
    firstName: string;
    fullName: string;
    supplierName: string;
    supplierFullName: string;
    inn: string;
    ogrnip: string;
    kpp: string;
    unp: string;
    bin: string;
    unn: string;
    wb: boolean;
  }[] = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "results.temp.json"), "utf-8")
  );
  preprocessed = preprocessed.filter(el => el.username);

  const Comparison = z.object({
    same: z.boolean(),
  });

  for (let i = 0; i < preprocessed.length; i++) {
    const supplier = preprocessed[i];
    console.log(`Ищу ${supplier.fullName}`);
    try {
      const url = new URL("https://wildberries.ru/catalog/0/search.aspx");
      url.searchParams.set("search", `ИП ${supplier.fullName}`);
      await page.goto(url.toString());
      await page.locator(".product-card__link").click();
      const res = await page.waitForResponse((response) =>
        response.url().endsWith("/card.json")
      );
      const data: {
        selling: {
          supplier_id: number;
        };
      } = await res.json();

      await page.goto(
        `https://wildberries.ru/seller/${data.selling.supplier_id}`
      );
      const otherRes = await page.waitForResponse((response) =>
        response.url().includes("/data/supplier-by-id/")
      );
      const supplierData: {
        supplierName: string;
        supplierFullName: string;
        inn: string;
        ogrnip: string;
        kpp: string;
        unp: string;
        bin: string;
        unn: string;
      } = await otherRes.json();

      console.log(supplierData);

      const result = await openai.responses.parse({
        tools: [
          {
            type: "web_search_preview",
          },
        ],
        model: "gpt-4.1-mini",
        input: `
        Предприниматель 1: ИП ${supplier.fullName},
        предприниматель 2: ${JSON.stringify(supplierData)}
    `,
        instructions:
          "Твоя задача - найти данные предпринимателя 1 (ИНН, КПП, ОГРНИП или любые другие для сравнения) и сравнить их с данными 2.",
        text: {
          format: zodTextFormat(Comparison, "result"),
        },
      });

      if (!result.output_parsed?.same) {
        console.log("Совпадения нет!");
      } else {
        console.log("Совпадение есть! Сохраняю данные...");
        preprocessed[i] = {
            ...preprocessed[i],
            wb: true,
            ...supplierData
        }
      }
    } catch (error) {
      console.log("Произошла ошибка!");
    } finally {
      console.log("Перехожу к следующему...");
    }
  }

  console.log('Парсинг завершен! сохраняю данные...');
  await fs.writeFile(path.join(process.cwd(), 'parsed.temp.json'), JSON.stringify(preprocessed), 'utf-8');
  await browser.close();
  return;
})();
