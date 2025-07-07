import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { manager } from "./db";
import { Bot } from "./entities/bot";
import { AI } from "./ai";
import { wait } from "./utils";
import { amo } from "./crm";

export const clients = new Map<string, TelegramClient>();

const callback = async (e: NewMessageEvent, client: TelegramClient, ai: AI) => {
  const me = await client.getMe();
  const bot = await manager.findOne(Bot, {
    where: {
      phone: me.phone,
    },
    relations: {
      leads: true,
    },
  });
  if (!bot) return;
  const dialogs = await client.getDialogs();
  const dialog = dialogs.find(
    (el) =>
      el.entity?.className === "User" &&
      el.entity.id.toJSON() === e.message.senderId?.toJSON(),
  );
  if (!dialog) return;
  const entity = dialog.entity as Api.User;

  const lead = bot.leads.find((el) => el.username === entity.username);
  if (!lead) return;

  if (!lead.replied) {
    lead.replied = true;
  }

  await client.invoke(
    new Api.messages.ReadHistory({
      peer: lead.username,
    }),
  );
  await client.invoke(
    new Api.messages.SetTyping({
      peer: lead.username,
      action: new Api.SendMessageTypingAction(),
    }),
  );
  await wait(5);
  const res = await ai.respond(
    e.message.text,
    lead.previousResId,
    me.firstName!,
  );
  lead.previousResId = res.id;
  try {
    const msgs = await client.getMessages(lead.username, {
      reverse: true
    });
    const asStr = msgs.map<string>(el => `${el.senderId?.toJSON() == me.id.toJSON() ? 'Бот' : 'Пользователь'}: ${el.text}`).join('\n');
    const category = amo.getStatusId(await ai.determine(asStr));
    
    await amo.editDeal({
      id: lead.amoId,
      custom_fileds_values: [
        {
          field_id: 758239,
          values: [
            {
              value: asStr
            }
          ]
        }
      ],
      status_id: category,
    })
  } catch (error) {
    console.error(error);
  }
  await manager.save(lead);
  await client.sendMessage(lead.username, {
    message: res.text,
  });
};

export const init = async () => {
  const bots = await manager.find(Bot, {
    where: {
      blocked: false,
      loggedIn: true,
    },
    relations: {
      user: true,
    },
  });
  for (const bot of bots) {
    const session = new StringSession(bot.token);
    const client = new TelegramClient(
      session,
      +process.env.TG_API_ID!,
      process.env.TG_API_HASH!,
      {},
    );
    clients.set(bot.phone, client);
    await client.connect();
    client.addEventHandler(async (e: NewMessageEvent) => {
      if (e.isPrivate) {
        await callback(e, client, new AI(bot.user.prompt));
      }
    }, new NewMessage());
  }
};

export const sendCode = async (bot: Bot) => {
  const apiCredentials = {
    apiId: +process.env.TG_API_ID!,
    apiHash: process.env.TG_API_HASH!,
  };

  const client = new TelegramClient(
    new StringSession(),
    +process.env.TG_API_ID!,
    process.env.TG_API_HASH!,
    {},
  );

  await client.connect();
  if (await client.checkAuthorization()) return;

  const sendCodeResult = await client.sendCode(
    apiCredentials,
    bot.phone,
    false,
  );
  bot.codeHash = sendCodeResult.phoneCodeHash;
  await manager.save(bot);
  clients.set(bot.phone, client);
  client.addEventHandler(async (e: NewMessageEvent) => {
    if (e.isPrivate) {
      await callback(e, client, new AI(bot.user.prompt));
    }
  }, new NewMessage());
};

export const login = async (bot: Bot, code: string) => {
  const client = clients.get(bot.phone);
  if (!client) return;

  await client.invoke(
    new Api.auth.SignIn({
      phoneCode: code,
      phoneCodeHash: bot.codeHash,
      phoneNumber: bot.phone,
    }),
  );

  const me = await client.getMe();

  bot.loggedIn = true;
  bot.codeHash = "";
  await manager.save(bot);
};

export const getDialog = async (
  username: string,
  phone: string,
): Promise<
  {
    role: "user" | "ai";
    text: string;
  }[]
> => {
  const client = clients.get(phone);
  if (!client) throw new Error("No client");
  await client.getDialogs();

  const me = await client.getMe();
  const messages = await client.getMessages(username, {
    reverse: true,
  });

  return messages.map<{
    role: "user" | "ai";
    text: string;
  }>((el) => {
    if (el.senderId?.toJSON() === me.id.toJSON())
      return {
        role: "ai",
        text: el.text,
      };
    return {
      role: "user",
      text: el.text,
    };
  });
};
