import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import "dotenv/config";
import axios, { AxiosResponse } from "axios";
import type { LeadBase } from "./entities/leadBase";

const bot = new TelegramBot(process.env.MANAGER_TOKEN!, {
  polling: true,
});
const token: string = process.env.ILSUR_TOKEN!;

let waiter: string = "";
let baseId: number | null = null;
axios.defaults.headers.common.Authorization = `Bearer ${token}`;
axios.defaults.baseURL = "http://server";

bot.setMyCommands([
  {
    command: "start",
    description: "Запустить бота",
  },
  {
    command: "mail",
    description: "Запустить рассылку",
  },
]);

bot.onText(/\/mail/, async (msg) => {
  const bases: AxiosResponse<LeadBase[]> = await axios.get("/api/leads/bases");
  await bot.sendMessage(msg.from!.id, "Выберите клиентскую базу для рассылки", {
    reply_markup: {
      inline_keyboard: bases.data.map<InlineKeyboardButton[]>((el) => [
        {
          text: String(el.id),
          callback_data: `mailbase-${el.id}`,
        },
      ]),
    },
  });
});

bot.on("callback_query", async (q) => {
  if (q.data?.startsWith("mailbase-")) {
    const id = Number(q.data.split("-")[1]);
    baseId = id;
    waiter = "amount";
    await bot.sendMessage(
      q.from!.id,
      "Введите необходимое количество сообщений"
    );
  }

  if (q.data?.startsWith('launch-')) {
    const baseId = Number(q.data.split("-")[1]);
    const amount = Number(q.data.split("-")[2]);
    await axios.post('/api/mailings', {
        baseId,
        amount
    });
    await bot.sendMessage(q.from.id, 'Рассылка запущена');
  }
});

bot.onText(/./, async (msg) => {
  if (!msg.from) return;
  if (waiter === "amount") {
    waiter = "";
    // const evaluation: AxiosResponse<{
    //   enough: boolean;
    // }> = await axios.post("/api/mailings/evaluation", {
    //     baseId,
    //     amount: Number(msg.text)
    // });
    // if (!evaluation.data.enough) {
    //     return await bot.sendMessage(msg.from.id, 'Для такого объема нехватает аккаунтов');
    // }
    await bot.sendMessage(msg.from.id, 'Объем выполнить возможно!', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Запустить',
                        callback_data: `launch-${baseId}-${Number(msg.text)}`
                    }
                ]
            ]
        }
    })
    baseId = null;
  }
});

