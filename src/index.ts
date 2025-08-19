import { db } from "./db";
import "dotenv/config";
import { mailer } from "./mailer";
import TelegramBot from "node-telegram-bot-api";

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
      command: 'mail',
      description: 'Запуск рассылки'
    },
    {
      command: 'stop',
      description: 'Остановка рассылки'
    },
    {
      command: 'add',
      description: 'Добавить бота'
    }
  ])

  bot.onText(/\/mail/, async (msg) => {
    waiter = Waiter.Amount;
    await bot.sendMessage(msg.chat.id, 'Пришлите количество агентов');
  });

  bot.onText(/./, async (msg) => {
    if (msg.text?.startsWith('/')) return;

    if (waiter === Waiter.Amount) {
      waiter = Waiter.None;
      await bot.sendMessage(msg.chat.id, 'Рассылка запущена.');
      await mailer.mail(Number(msg.text), 15);
    } else if (waiter === Waiter.Phone) {
      await mailer.addAgent(msg.text!);
      waiter = Waiter.Code;
      await bot.sendMessage(msg.chat.id, 'Теперь пришлите код из смс');
    } else if (waiter === Waiter.Code) {
      waiter = Waiter.None;
      await mailer.loginAgent(msg.text!);
      await bot.sendMessage(msg.chat.id, 'Агент добавлен!');
    }
  });

  bot.onText(/\/stop/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Рассылка остановлена.');
    await mailer.stop();
  });

  bot.onText(/\/add/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Пришлите номер телефона аккаунта');
    waiter = Waiter.Phone;
  });
  


});
