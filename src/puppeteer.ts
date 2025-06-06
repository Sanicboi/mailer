import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import fs from "fs/promises";
import path from "path";
import Excel from "exceljs";
(async () => {
  console.log("Парсер вб продавцов v1.0 запускается...");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
  });

  console.log("Читаю файл с пользователями...");
  let preprocessed: {
    phone: string;
    id: string;
    username?: string;
    firstName: string;
    fullName: string;
    inn: string;
    wb: boolean;
    categories: string;
  }[] = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "results.temp.json"), "utf-8")
  );
  preprocessed = preprocessed.filter((el) => el.username);

  const Data = z.object({
    inn: z.string(),
  });

  console.log("Подгружаю базу...");
  const map: Map<string, string> = new Map();

  const workbook = new Excel.stream.xlsx.WorkbookReader(
    path.join(process.cwd(), "db.xlsx"),
      {}
  );
  for await (const sheet of workbook) {
    for await (const row of sheet) {
      if (Array.isArray(row.values)) {
        if (row.values[19] && typeof row.values[19] === 'string') {
          map.set(row.values[19], String(row.values[11]));
        }

        if (row.values[25] && typeof row.values[25] === 'string') {
          map.set(row.values[25], String(row.values[11]));
        }
      }
    }
  }

  for (let i = 0; i < preprocessed.length; i++) {
    const supplier = preprocessed[i];
    console.log(`Ищу ${supplier.fullName}`);
    try {
      const result = await openai.responses.parse({
        tools: [
          {
            type: "web_search_preview",
          },
        ],
        model: "gpt-4.1-mini",
        input: `Предприниматель: ИП ${supplier.fullName}`,
        instructions: "Твоя задача - найти ИНН предпринимателя.",
        text: {
          format: zodTextFormat(Data, "result"),
        },
      });

      if (!result.output_parsed) throw new Error("не удалось найти ИНН");

      console.log("Ищу в базе..");



      preprocessed[i].wb = map.has(result.output_parsed.inn);
      preprocessed[i].inn = result.output_parsed.inn;
      preprocessed[i].categories = map.get(result.output_parsed.inn) ?? '';
    } catch (error) {
      console.log("Произошла ошибка!");
    } finally {
      console.log("Перехожу к следующему...");
    }
  }

  console.log("Парсинг завершен! сохраняю данные...");
  await fs.writeFile(
    path.join(process.cwd(), "parsed.temp.json"),
    JSON.stringify(preprocessed),
    "utf-8"
  );
  return;
})();
