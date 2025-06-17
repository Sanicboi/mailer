import axios, { AxiosResponse } from "axios";
import TelegramBot from "node-telegram-bot-api";
import { Bot } from "./entity/Bot";
import { BotGroup } from "./entity/BotGroup";


const bot = new TelegramBot(process.env.MANAGER_TOKEN!, {
  polling: true,
});

let addingGroup = false;
let botPhones: string[] = [];

bot.onText(/^\/getbots$/, async (msg) => {
  const res: AxiosResponse<Bot[]> = await axios.get("http://server/api/bots");
  await bot.sendMessage(
    msg.from!.id,
    `Список ботов:\n${res.data.map<string>((el) => el.phone).join("\n")}`
  );
});

bot.onText(/^\/getbot /, async (msg) => {
  const botPhone = msg.text!.split(" ")[1];
  const res: AxiosResponse<Bot> = await axios.get(
    `http://server/api/bots/${botPhone}`
  );
  await bot.sendMessage(
    msg.from!.id,
    `
        Бот ${res.data.phone}
        Заблокирован: ${res.data.blocked}
        ID партии: ${res.data.group.id}
        Имя пользователя: ${res.data.username}
        `
  );
});

bot.onText(/\/sendcode/, async (msg) => {
  const botPhone = msg.text!.split(" ")[1];
  await axios.post("http://server/api/auth/bot", {
    phone: botPhone,
  });
  await bot.sendMessage(msg.from!.id, "Теперь воспользуйтесь командой /login");
});

bot.onText(/\/login/, async (msg) => {
  const phone = msg.text!.split(" ")[1];
  const code = msg.text!.split(" ")[2];
  await axios.post("http://server/api/auth/code", {
    phone,
    code,
  });
  await bot.sendMessage(msg.from!.id, "Вход окончен.");
});

bot.onText(/^\/getgroups$/, async (msg) => {
  const res: AxiosResponse<BotGroup[]> = await axios.get(
    "http://server/api/groups"
  );
  await bot.sendMessage(
    msg.from!.id,
    `Партии ботов:\n${res.data.map<string>((el) => String(el.id)).join("\n")}`
  );
});

bot.onText(/^\/getgroup /, async (msg) => {
  const id = +msg.text!.split(" ")[1];
  const res: AxiosResponse<BotGroup> = await axios.get(
    `http://server/api/groups/${id}`
  );
  await bot.sendMessage(
    msg.from!.id,
    `
            Партия ботов:
            ID: ${res.data.id}
            Боты:\n${res.data.bots.map((el) => el.phone).join("\n")}
        `
  );
});

bot.onText(/\/addgroup/, async (msg) => {
    addingGroup = true;
    botPhones = [];
    await bot.sendMessage(msg.from!.id, 'Пришлите мне номера ботов и нажмите стоп для сохранения.');
});




bot.onText(/./, async (msg) => {
    if (msg.text?.startsWith('/')) return;
    if (!msg.text) return;

    if (addingGroup) {
        botPhones.push(msg.text);
        await bot.sendMessage(msg.from!.id, 'Добавил. Пришлите еще или нажмите стоп.', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Стоп',
                            callback_data: 'stop'
                        }
                    ]
                ]
            }
        })
    }
});


bot.on('callback_query', async (q) => {
    if (addingGroup) {
        addingGroup = false;
        const res: AxiosResponse<{id: number}> = await axios.post('http://server/api/groups', botPhones);
        botPhones = [];
        await bot.sendMessage(q.from.id, `Группа ${res.data.id} создана.`);
    }
});
