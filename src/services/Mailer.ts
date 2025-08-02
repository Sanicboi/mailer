import { IsNull } from "typeorm";
import { manager } from "../db";
import { Bot } from "../entities/bot";
import { Lead } from "../entities/lead";
import { TGClient } from "./TGCLient";
import dayjs from "dayjs";
import { ai } from "./AI";
import { exporter, LeadData } from "./Exporter";

class Mailer {
  private _clients: Map<string, TGClient> = new Map();
  private _loggingIn: Map<string, TGClient> = new Map();
  private _cooldown: number = 2; // in days
  private _maxPerClient: number = 15;
  constructor() {}

  private async _callback(username: string, client: TGClient, text: string): Promise<void> {
    const lead = await manager.findOne(Lead, {
      where: {
        bot: {
          phone: client.phone
        },
        username
      },
    });
    if (!lead) throw new Error("Null lead");
    if (lead.finished) return;
    const res = await ai.respond(text, ai.prompt, lead.resId);
    if (!lead.replied) {
      lead.replied = true;
    }
    lead.resId = res.text;
    await client.sendMessage(lead.username, res.text);
    try {
      const dialog = await client.getDialog(lead.username);
      const finished = await exporter.editLead(new LeadData(lead.username, dialog, lead.phone, lead.inn), lead.amoId);
      if (finished) {
        lead.finished = true;
      }
    } catch (error) {
      console.error(error)
    }
    await manager.save(lead);
  }

  public async init(): Promise<void> {
    const bots = await manager.find(Bot, {
      where: {
        blocked: false,
      },
    });
    for (const bot of bots) {
      try {
        const client = new TGClient(bot);
        await client.init();
        client.setCallback(this._callback);
        this._clients.set(client.phone, client);
      } catch (error) {
        bot.blocked = true;
        await manager.save(bot);
      }
    }
  }

  public async mail(amount: number): Promise<void> {
    const leads = await manager.find(Lead, {
      where: {
        resId: IsNull(),
        finished: false,
        replied: false,
        sent: false,
      },
      take: amount,
    });
    const numberOfBots = Math.ceil(leads.length / this._maxPerClient);
    const bots: TGClient[] = Array.from(this._clients.values()).filter(
      (el) => dayjs().diff(el.bot.lastMessage, "d") >= this._cooldown
    );
    if (bots.length < numberOfBots) {
      return;
    }

    for (let i = 0; i < leads.length; i++) {
      const bot = bots[i % bots.length];
      try {
        const res = await ai.start(leads[i].dialogData, ai.prompt);
        leads[i].resId = res.id;
        await manager.save(leads[i]);
        await bot.sendMessage(leads[i].username, res.text);
        leads[i].sent = true;
        leads[i].bot = bot.bot;
        try {
          const newData = await exporter.createLead(
            new LeadData(
              leads[i].username,
              `Первое сообщение:\n${res.text}`,
              leads[i].phone,
              leads[i].inn
            ),
          );
          leads[i].amoId = newData;
        } catch (error) {
          console.error(`Export error: ${error}`);
        }
        await manager.save(leads[i]);
      } catch (error) {
        console.error(error);
      }
    }
  }

  public async add(phone: string): Promise<void> {
    const bot = new Bot();
    bot.phone = phone;
    await manager.save(bot);
    const client = new TGClient(bot);
    await client.sendCode();
    this._loggingIn.set(phone, client);
  }

  public async login(phone: string, code: string): Promise<void> {
    const client = this._loggingIn.get(phone);
    if (!client) return;

    await client.login(code);
    client.setCallback(this._callback);
    this._clients.set(phone, client);
    this._loggingIn.delete(phone);
  }

  public getByIdx(i: number): TGClient {
    const clients = Array.from(this._clients.values()).filter(el => !el.bot.blocked);
    return clients[i % clients.length];
  }
}

export const mailer = new Mailer();
