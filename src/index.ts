import { db, manager } from "./db";
import "dotenv/config";
import { mailer } from "./services/Mailer";
import TelegramBot from "node-telegram-bot-api";
import path from "path";
import axios, { AxiosResponse } from "axios";
import { Lead } from "./entities/lead";
import { Bot } from "./entities/bot";

const Btn = (text: string, data: string) => [
  {
    text,
    callback_data: data,
  },
];

enum Waiter {
  None = 0,
  Leads = 1,
  Phone = 2,
  Code = 3,
  Amount = 4
}

let waiter: Waiter = Waiter.None;
let phone: string = '';

db.initialize().then(async () => {
  await mailer.init();

  const bot = new TelegramBot(process.env.ILSUR_TOKEN!, {
    polling: true,
  });

  bot.onText(/\/import/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "Выберите, что импортировать", {
      reply_markup: {
        inline_keyboard: [
          Btn("Лидов", "import-leads"),
          Btn("Ботов", "import-bots"),
        ],
      },
    });
  });

  bot.on("callback_query", async (q) => {
    if (q.data === "import-leads") {
      waiter = Waiter.Leads;
      await bot.sendMessage(q.from.id, "Пришлите мне файл с лидами");
    } 
    if (q.data === 'import-bots') {
      waiter = Waiter.Phone;
      await bot.sendMessage(q.from.id, 'Пришлите мне номер телефона бота');
    }
  });

  bot.on("document", async (msg) => {
    if (!msg.document) return;
    if (waiter !== Waiter.Leads) return;
    const url = await bot.getFileLink(msg.document.file_id);
    if (path.extname(url) !== ".json") {
      await bot.sendMessage(msg.chat.id, "Файл должен быть .json!");
      return;
    }

    const buffer: AxiosResponse<Buffer> = await axios.get(url, {
      responseType: "arraybuffer",
    });
    const fileData: {
      username: string,
      phone: string,
      inn: string,
      data: string
    }[] = JSON.parse(buffer.data.toString("utf-8"));
    waiter = Waiter.None;

    for (const lead of fileData) {
      const record = new Lead();
      record.inn = lead.inn;
      record.phone = lead.phone;
      record.username = lead.username;
      record.dialogData = lead.data;
      await manager.save(record);
    }

    await bot.sendMessage(msg.chat.id, 'Все лиды импортированы');
  });

  bot.onText(/./, async (msg) => {
    if (msg.text?.startsWith('/')) return;

    if (waiter === Waiter.Phone) {
      waiter = Waiter.Code;
      await mailer.add(msg.text!);
      phone = msg.text!;
      await bot.sendMessage(msg.chat.id, 'Пришлите мне код');
    } else if (waiter === Waiter.Code) {
      waiter = Waiter.None;
      await mailer.login(phone, msg.text!);
      phone = '';
      await bot.sendMessage(msg.chat.id, 'Бот добавлен');
    } else if (waiter === Waiter.Amount) {
      waiter = Waiter.None;
      await bot.sendMessage(msg.chat.id, 'Рассылка запущена');
      await mailer.mail(+msg.text!);
    }
  });

  bot.onText(/\/mail/, async (msg) => {
    waiter = Waiter.Amount;
    await bot.sendMessage(msg.chat.id, "Пришлите мне количество лидов");
  });
});
