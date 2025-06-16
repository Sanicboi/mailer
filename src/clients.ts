import { Api, TelegramClient } from "telegram";
import { AppDataSource } from "./data-source";
import { Bot } from "./entity/Bot";
import { StringSession } from "telegram/sessions";

const manager = AppDataSource.manager;
export const clients = new Map<string, TelegramClient>();

export const init = async () => {
  const bots = await manager.find(Bot, {
    where: {
      blocked: false,
      loggedIn: true,
    },
  });
  for (const bot of bots) {
    const session = new StringSession(bot.token);
    const client = new TelegramClient(
      session,
      +process.env.TG_API_ID!,
      process.env.TG_API_HASH!,
      {}
    );
    clients.set(bot.phone, client);
    await client.connect();
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
    {}
  );

  await client.connect();
  if (await client.checkAuthorization()) return;

  const sendCodeResult = await client.sendCode(
    apiCredentials,
    bot.phone,
    false
  );
  bot.codeHash = sendCodeResult.phoneCodeHash;
  await manager.save(bot);
  clients.set(bot.phone, client);
};

export const login = async (bot: Bot, code: string) => {
  const client = clients.get(bot.phone);
  if (!client) return; 

  await client.invoke(new Api.auth.SignIn({
    phoneCode: code,
    phoneCodeHash: bot.codeHash,
    phoneNumber: bot.phone
  }));

  const me = await client.getMe();

  bot.loggedIn = true;
  bot.codeHash = '';
  bot.username = String(me.username);
  await manager.save(bot);
};


export const getDialog = async (username: string, phone: string): Promise<{
  role: 'user' | 'ai',
  text: string
}[]> => {
  const client = clients.get(phone);
  if (!client) throw new Error("No client");
  await client.getDialogs();

  const me = await client.getMe();
  const messages = await client.getMessages(username, {
    reverse: true
  });

  return messages.map<{
    role: 'user' | 'ai',
    text: string
  }>(el => {
    if (el.senderId?.toJSON() === me.id.toJSON()) return {
      role: 'ai',
      text: el.text
    }
    return {
      role: 'user',
      text: el.text
    }
  });
  
}