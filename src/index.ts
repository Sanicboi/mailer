import { db, manager } from "./db";
import "dotenv/config";
import { mailer } from "./services/Mailer";
import TelegramBot from "node-telegram-bot-api";
import path from "path";
import axios, { AxiosResponse } from "axios";
import { Lead } from "./entities/lead";
import { Bot } from "./entities/bot";
import fs from 'fs/promises';
import { ai } from "./services/AI";

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
  Amount = 4,
  Phones = 5,
  Names = 6
}

let waiter: Waiter = Waiter.None;
let phone: string = '';
let phones: string[] = [];

db.initialize().then(async () => {
  await mailer.init();

  const bot = new TelegramBot(process.env.ILSUR_TOKEN!, {
    polling: true,
  });

  await bot.setMyCommands([
    {
      command: 'import',
      description: 'Ручной импрот контактов или ботов'
    },
    {
      command: 'mail',
      description: 'Запуск рассылки'
    },
    {
      command: 'parse',
      description: 'Запуск парсинга лидов'
    }
  ])

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
    } else if (waiter === Waiter.Phones) {
      waiter = Waiter.Names;
      phones = msg.text!.split('\n');
      await bot.sendMessage(msg.chat.id, 'Теперь пришлите мне список ФИО через строчку');
    } else if (waiter === Waiter.Names) {
      
      const names = msg.text!.split('\n');
      if (names.length !== phones.length) {
        waiter = Waiter.Names;
        await bot.sendMessage(msg.chat.id, 'Количество имен не совпадает с количеством сообщений! Пришлите имена заново');
        return;
      }
      waiter = Waiter.None;
      await bot.sendMessage(msg.chat.id, 'Начинаю парсинг. Это займет время');
      
      await bot.sendMessage(msg.chat.id, 'Открываю файл с ИНН...');
      const inns = (await fs.readFile(path.join(process.cwd(), '.inn'), 'utf-8')).split('\n');
      const set = new Set(inns);
      
      await bot.sendMessage(msg.chat.id, 'Ищу в телеграм...');
      for (let i = 0; i < phones.length; i++) {
        const client = mailer.getByIdx(i);
        try {
          const [lastName, firstName, middleName] = names[i].split(' ');
          const res = await client.getUsername(phones[i], firstName, lastName);
          await bot.sendMessage(msg.chat.id, 'Нашел в тг! Определяю ИНН...');
          const inn = await ai.getINN(names[i]);
          const exists = set.has(inn);
          if (!exists) {
            await bot.sendMessage(msg.chat.id, 'Не нашел в базе вб');
            continue;
          }
          await bot.sendMessage(msg.chat.id, 'Нашел в базе вб. Добавляю...');
          const lead = new Lead();
          lead.inn = inn;
          lead.username = res;
          lead.phone = phones[i];
          lead.dialogData = `Имя: ${names[i]}\nПродает на Вайлдберриз (ВБ). Категории не известны`;
          await manager.save(lead);
        } catch (error) {
          console.error(error);
        }
      }

      await bot.sendMessage(msg.chat.id, 'Парсинг окночен')

    }
  });

  bot.onText(/\/mail/, async (msg) => {
    waiter = Waiter.Amount;
    await bot.sendMessage(msg.chat.id, "Пришлите мне количество лидов");
  });

  bot.onText(/\/parse/, async (msg) => {
    waiter = Waiter.Phones;
    await bot.sendMessage(msg.chat.id, 'Пришлите мне список номеров телефона (одним сообщением, через строчку)');
  });


});
