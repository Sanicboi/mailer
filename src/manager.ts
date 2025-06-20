import TelegramBot from "node-telegram-bot-api";
import { Api, client, TelegramClient } from "telegram";
import { AppDataSource } from "./data-source";
import { Bot } from "./entity/Bot";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { AI } from "./ai";
import { User } from "./entity/User";
import { IsNull } from "typeorm";
import { Queue } from "./queue";
import { AmoCrm } from "./crm";

interface GenerationJob {
  to: string;
  data: string;
}

interface GenerationResult extends GenerationJob {
  text: string;
  id: string;
}

interface MailingJob extends GenerationResult {
  client: TelegramClient;
}

const manager = AppDataSource.manager;

export class Manager {
  private crm: AmoCrm = new AmoCrm();
  private bot: TelegramBot = new TelegramBot(process.env.MANAGER_TOKEN!, {
    polling: true,
  });
  private ai = new AI();
  private clients: Map<string, TelegramClient> = new Map();

  private async callback(client: TelegramClient, e: NewMessageEvent) {
    if (e.isPrivate) {
      const bot = await manager.findOne(Bot, {
        where: {
          blocked: false,
          token: client.session.save()!,
        },
        relations: {
          users: true,
        },
      });
      if (!bot) return;
      const dialogs = await client.getDialogs();
      const dialog = dialogs.find(
        (el) =>
          el.entity?.className === "User" &&
          el.entity.id.toJSON() === e.message.senderId?.toJSON()
      );
      if (!dialog) return;
      const u = dialog.entity as Api.User;
      const user = bot.users.find((el) => el.username === u.username!);
      if (!user) return;
      if (!user.replied) {
        user.replied = true;
      }
      await client.invoke(
        new Api.messages.ReadHistory({
          peer: user.username,
        })
      );
      await client.invoke(
        new Api.messages.SetTyping({
          peer: user.username,
          action: new Api.SendMessageTypingAction(),
        })
      );
      await new Promise((res, rej) => setTimeout(res, 1000 * 5));
      const me = await client.getMe();
      const res = await this.ai.respond(
        e.message.text,
        user.lastMsgId!,
        me.firstName!
      );
      console.log(user, user.lastMsgId, res.id);
      user.lastMsgId = res.id;
      await manager.save(user);
      await client.sendMessage(user.username, {
        message: res.text,
      });
    }
  }

  constructor() {}

  /**
   * Перезапуск всех клиентов
   */
  private async reload() {
    const bots = await manager.find(Bot, {
      where: {
        blocked: false,
      },
    });

    for (const [token, client] of this.clients) {
      await client.destroy();
      this.clients.delete(token);
    }

    for (const bot of bots) {
      const session = new StringSession(bot.token);
      const client = new TelegramClient(
        session,
        +process.env.TG_API_ID!,
        process.env.TG_API_HASH!,
        {
          // proxy: {
          //   ip: process.env.PROXY_IP!,
          //   port: +process.env.PROXY_PORT!,
          //   secret: process.env.PROXY_SECRET!,
          //   MTProxy: true,
          // },
        }
      );
      const res = await client.connect();
      if (res) {
        this.clients.set(bot.token, client);
        client.addEventHandler(
          async (e) => this.callback(client, e),
          new NewMessage()
        );
      } else {
        await client.destroy();
      }
    }
  }

  private async mail(maxPerClient: number) {
    const bots = await manager.find(Bot, {
      where: {
        blocked: false,
      },
    });
    const users = await manager.find(User, {
      where: {
        lastMsgId: IsNull(),
      },
      take: maxPerClient * bots.length,
    });

    const generateQueue = new Queue<GenerationJob, GenerationResult>(
      async (j) => {
        const res = await this.ai.createFirstMessage(j.data);
        console.log(res);
        return {
          ...j,
          ...res,
        };
      },
      30,
      1
    );

    let messages = await generateQueue.addAndProcess(
      users.map<GenerationJob>((el) => ({
        to: el.username,
        data: el.additionalData,
      }))
    );

    console.log(messages);

    const sendQueue = new Queue<MailingJob, any>(
      async (j) => {
        try {
          const user = await manager.findOneBy(User, {
            username: j.to,
          });
          if (!user) return;
          console.log(user, user.lastMsgId, j.id);
          user.lastMsgId = j.id;
          user.bot = new Bot();
          user.bot.token = j.client.session.save()!;
          await manager.save(user);
          await j.client.sendMessage(j.to, {
            message: j.text,
          });
          user.sent = true;
          await manager.save(user);
        } catch (e) {
          console.error(e);
        }
      },
      bots.length,
      4 * 60
    );

    await sendQueue.addAndProcess(
      messages.map<MailingJob>((el, idx) => {
        return {
          ...el,
          client: this.clients.get(bots[idx % bots.length].token)!,
        };
      })
    );
  }

  public async stats(chat: number) {
    const users = await manager.find(User);
    const sentTo = users.filter(el => el.sent).length;
    const replied = users.filter(el => el.replied).length;
    await this.bot.sendMessage(chat, `
        Всего пользователей: ${users.length}
        Из них получили сообщение: ${sentTo}
        Из них ответили: ${replied}
      `);
  }

  public async start() {
    await this.reload();
    console.log("done connecting");
    this.bot.onText(/\/mail/, async (msg) => {
      await this.mail(15);
    });
  }
}
