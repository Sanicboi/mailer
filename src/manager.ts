import TelegramBot from "node-telegram-bot-api";
import { client, TelegramClient } from "telegram";
import { AppDataSource } from "./data-source";
import { Bot } from "./entity/Bot";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { AI } from "./ai";
import { User } from "./entity/User";
import { IsNull } from "typeorm";
import { Queue } from "./queue";

interface GenerationJob {
  to: string;
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
  private bot: TelegramBot = new TelegramBot(process.env.MANAGER_TOKEN!);
  private ai = new AI();
  private clients: Map<string, TelegramClient> = new Map();
  private code: string = '';


  private async callback(client: TelegramClient, e: NewMessageEvent) {}

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
        {},
      );
      const res = await client.connect();
      if (res) {
        this.clients.set(bot.token, client);
        client.addEventHandler(
          async (e) => this.callback(client, e),
          new NewMessage(),
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
      take: maxPerClient * bots.length
    });

    const generateQueue = new Queue<GenerationJob, GenerationResult>(
      async (j) => {
        const res = await this.ai.createFirstMessage();
        return {
          ...j,
          ...res,
        };
      },
      30,
      0.5,
    );

    let messages = await generateQueue.addAndProcess(
      users.map<GenerationJob>((el) => ({
        to: el.username,
      })),
    );



    const sendQueue = new Queue<MailingJob, any>(
      async (j) => {
        await j.client.sendMessage(j.to, {
          message: j.text,
        });
        await manager
          .getRepository(User)
          .createQueryBuilder()
          .update()
          .where("user.username = :username", {
            username: j.to,
          })
          .set({
            lastMsgId: j.id,
            bot: {
              token: j.client.session.save()!,
            },
          })
          .execute();
      },
      bots.length,
      60 * 4,
    );

    await sendQueue.addAndProcess(
      messages.map<MailingJob>((el, idx) => {
        return {
          ...el,
          client: this.clients.get(bots[idx % bots.length].token)!,
        };
      }),
    );
  }

  public async start() {
    await this.reload();

    this.bot.onText(/\/mail/, async (msg) => {
      await this.mail(15);
    })
  }

  private async onPhone(phone: string) {
    const session = new StringSession();
    const client = new TelegramClient(session, +process.env.TG_API_ID!, process.env.TG_API_HASH!, {});
    this.code = '';
    await client.start({
      phoneNumber: phone,
      onError(err) {
        console.log(err);
      },
      phoneCode: async () => await new Promise((resolve, reject) => {
        while (this.code === '') {
        }
        resolve(this.code);
      })
    });

    const bot = new Bot();
    bot.token = client.session.save()!;
    bot.username = (await client.getMe()).username!;
    await manager.save(bot);

  }
}
