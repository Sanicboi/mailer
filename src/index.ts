import { db } from "./db";
import "dotenv/config";
import { mailer } from "./mailer";
import TelegramBot from "node-telegram-bot-api";
import { BotState } from "./entities/bot";
import { wait } from "./utils";

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
  ConfirmPhone = 5,
  DenyPhone = 6
}

let waiter: Waiter = Waiter.None;
let phone: string = "";
let phones: string[] = [];

db.initialize().then(async () => {
  await mailer.init();

  const bot = new TelegramBot(process.env.ILSUR_TOKEN!, {
    polling: true,
  });

  await bot.setMyCommands([
    {
      command: "mail",
      description: "Запуск рассылки",
    },
    {
      command: "stop",
      description: "Остановка рассылки",
    },
    {
      command: "add",
      description: "Добавить бота",
    },
    {
      command: "get",
      description: "Статус аккаунтов",
    },
  ]);

  bot.onText(/\/mail/, async (msg) => {
    waiter = Waiter.Amount;
    await bot.sendMessage(msg.chat.id, "Пришлите количество агентов");
  });

  bot.onText(/./, async (msg) => {
    if (msg.text?.startsWith("/")) return;

    if (waiter === Waiter.Amount) {
      const amount = +msg.text!;
      const available = mailer
        .getAgents()
        .filter((el) => el.state === BotState.IDLE).length;
      if (available < amount) {
        await bot.sendMessage(
          msg.chat.id,
          `Недостаточно свободных агентов. Измените количество или отмените рассылку. Доступно агентов: ${available}`,
          {
            reply_markup: {
              inline_keyboard: [Btn("Отменить рассылку", "cancel")],
            },
          }
        );
        return;
      }
      waiter = Waiter.None;
      await bot.sendMessage(msg.chat.id, "Рассылка запущена.");
      await mailer.mail(amount, 15);
    } else if (waiter === Waiter.Phone) {
      await mailer.addAgent(msg.text!);
      waiter = Waiter.Code;
      await bot.sendMessage(msg.chat.id, "Теперь пришлите код из смс");
    } else if (waiter === Waiter.Code) {
      waiter = Waiter.None;
      await mailer.loginAgent(msg.text!);
      await bot.sendMessage(msg.chat.id, "Агент добавлен!");
    } else if (waiter === Waiter.ConfirmPhone) {
      waiter = Waiter.None;
      await mailer.confirm(msg.text!);
      await bot.sendMessage(msg.chat.id, 'Успешно заблокирован.');
    } else if (waiter === Waiter.DenyPhone) {
      waiter = Waiter.DenyPhone;
      await mailer.deny(msg.text!);
      await bot.sendMessage(msg.chat.id, 'Успешно разблокирован.');
    }
  });

  bot.onText(/\/stop/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "Рассылка остановлена.");
    await mailer.stop();
  });

  bot.onText(/\/add/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "Пришлите номер телефона аккаунта");
    waiter = Waiter.Phone;
  });


  bot.onText(/\/get/, async (msg) => {
    const agents = mailer.getAgents();
    let idle: string[] = [];
    let mailing: string[] = [];
    let possibleSpam: string[] = [];
    let confirmedSpam: string[] = [];
    let banned: string[] = [];
    let loggingIn: string[] = [];
    agents.forEach((el) => {
      switch (el.state) {
        case BotState.IDLE:
          idle.push(el.phone);
          break;
        case BotState.MAILING:
          mailing.push(el.phone);
          break;
        case BotState.POSSIBLE_SPAMBLOCK:
          possibleSpam.push(el.phone);
          break;
        case BotState.CONFIRMED_SPAMBLOCK:
          confirmedSpam.push(el.phone);
          break;
        case BotState.BANNED:
          banned.push(el.phone);
          break;
        case BotState.LOGGING_IN:
          loggingIn.push(el.phone);
          break;
      }
    });
    let res = `
Всего агентов: ${agents.length}

Активные, не рассылают сейчас: ${idle.length}
${idle.join("\n")}

Активные, рассылают сейчас: ${mailing.length}
${mailing.join("\n")}

Возможный спамблок: ${possibleSpam.length}
${possibleSpam.join("\n")}

Подтвержденный спамблок: ${confirmedSpam.length}
${confirmedSpam.join("\n")}

В бане: ${banned.length}
${banned.join("\n")}

Выполняют вход: ${loggingIn.length}
${loggingIn.join("\n")}
`;

    await bot.sendMessage(msg.chat.id, res, {
      reply_markup: {
        inline_keyboard: [
          Btn("Подтвердить блок аккаунта", "confirm"),
          Btn("Опровергнуть блок аккаунта", "deny"),
        ],
      },
    });
  });
});
