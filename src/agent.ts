import { Api, TelegramClient } from "telegram";
import { Bot, BotState } from "./entities/bot";
import { db } from "./db";
import { BlockedError, InUseError } from "./errors";
import { StringSession } from "telegram/sessions";
import { Lead } from "./entities/lead";
import { ai } from "./services/AI";
import { amo, CustomFieldID, StatusID } from "./crm";
import { NewMessage, NewMessageEvent } from "telegram/events";

export class Agent {
  private _bot: Bot;
  private _client: TelegramClient;
  private _phone: string;
  private _hash: string;
  private _leadsList: Lead[] = [];

  public get phone(): string {
    return this._phone;
  }

  public get toMail(): number {
    return this._leadsList.length;
  }

  public get lastMsg(): Date {
    return this._bot.lastMessage;
  }

  public get state(): BotState {
    if (!this._bot) return BotState.LOGGING_IN;
    return this._bot.state;
  }

  public get lastMessage(): Date {
    return this._bot.lastMessage;
  }

  constructor(phone: string, token?: string) {
    this._phone = phone;
    this._client = new TelegramClient(
      new StringSession(token ?? ""),
      +process.env.TG_API_ID!,
      process.env.TG_API_HASH!,
      {},
    );
  }

  public async connect(): Promise<void> {
    try {
      await this._client.connect();
      const res = await this._client.checkAuthorization();
      if (res) {
        await this._client.getMe(); // will throw an error if banned
      }
      this._client.addEventHandler((e) => this.callback(e), new NewMessage());
    } catch (error) {
      console.log(error);
      if (this.state === BotState.LOGGING_IN)
        throw new Error("Invalid login details");
      this._bot.state = BotState.BANNED;
      await db.manager.save(this._bot);
    }
  }

  public async sendCode(): Promise<void> {
    const res = await this._client.sendCode(
      {
        apiHash: process.env.TG_API_HASH!,
        apiId: +process.env.TG_API_ID!,
      },
      this._phone,
    );
    this._hash = res.phoneCodeHash;
  }

  public async login(code: string): Promise<void> {
    await this._client.invoke(
      new Api.auth.SignIn({
        phoneCode: code,
        phoneCodeHash: this._hash,
        phoneNumber: this._phone,
      }),
    );
    this._hash = "";
  }

  public async create() {
    const bot = new Bot();
    bot.phone = this._phone;
    bot.token = this._client.session.save()!;
    await db.manager.save(bot);
    this._bot = bot;
  }

  public async startMailing(): Promise<void> {
    if (
      this.state === BotState.BANNED ||
      this.state === BotState.CONFIRMED_SPAMBLOCK ||
      this.state === BotState.POSSIBLE_SPAMBLOCK
    )
      throw new BlockedError(this._phone);
    if (this.state === BotState.LOGGING_IN || this.state === BotState.MAILING)
      throw new InUseError(this._phone);
    this._bot.state = BotState.MAILING;
    await db.manager.save(this._bot);
  }

  public async markLeads(amount: number): Promise<void> {
    this._leadsList = await db
      .createQueryBuilder(Lead, "lead")
      .select()
      .where("lead.sent = false")
      .andWhere('lead."resId" IS NULL')
      .andWhere("lead.botPhone IS NULL")
      .take(amount)
      .getMany();

    if (this._leadsList.length > 0) {
      await db
      .createQueryBuilder(Lead, "lead")
      .update()
      .where("lead.username IN (:...ids)", {
        ids: this._leadsList.map((el) => el.username),
      })
      .set({
        bot: this._bot,
      })
      .execute();
    }
  }

  public async finish(): Promise<void> {
    switch (this.state) {
      case BotState.MAILING:
        if (this._leadsList.length > 0) {
          await db
          .createQueryBuilder(Lead, "lead")
          .update()
          .where("lead.username IN (:...ids)", {
            ids: this._leadsList.map((el) => el.username),
          })
          .set({
            bot: null,
            finished: false,
            sent: false,
            replied: false,
            resId: null,
          })
          .execute();
        }
        this._leadsList = [];
        this._bot.state = BotState.IDLE;
        break;
      case BotState.LOGGING_IN:
        this._hash = "";
        this._phone = "";
        await this._client.destroy();
        break;
      default:
        break;
    }
  }

  private async callback(e: NewMessageEvent): Promise<void> {
    if (!e.isPrivate) return;
    if (this.state === BotState.BANNED) return;
    if (this.state === BotState.LOGGING_IN) return;
    const fromId: string = e.message.senderId!.toJSON();

    const dialogs = await this._client.getDialogs();
    const dialog = dialogs.find((el) => el.entity?.id.toJSON() === fromId);
    if (!dialog) return;
    const asUser = dialog.entity as Api.User;

    const lead = await db.manager
      .createQueryBuilder(Lead, "lead")
      .select()
      .where("lead.username = :username", {
        username: asUser.username,
      })
      .andWhere("lead.sent = true")
      .getOne();
    if (!lead) return;

    if (!lead.replied) {
      lead.replied = true;
    }

    const response = await ai.respond(e.message.text, lead.resId);
    lead.resId = response.id;

    await this._client.sendMessage(lead.username, {
      message: response.text,
    });

    const conversation = await this.getConversation(lead.username, fromId);
    const status = await ai.getStatus(conversation);

    await amo.editDeal({
      id: +lead.amoId,
      status_id: amo.getStatusId(status.leadStatus),
      custom_fields_values: [
        {
          field_id: CustomFieldID.Dialog,
          values: [
            {
              value: conversation,
            },
          ],
        },
      ],
    });

    if (status.dialogueFinished) {
      lead.finished = true;
    }
    await db.manager.save(lead);
  }

  private async getConversation(name: string, clId: string): Promise<string> {
    const msgs = await this._client.getMessages(name, {
      reverse: true,
    });
    return msgs
      .map<string>((el) => {
        switch (el.senderId?.toJSON()) {
          case clId:
            return `Пользователь: ${el.text}`;
          default:
            return `Бот: ${el.text}`;
        }
      })
      .join("\n\n");
  }

  public async mail(): Promise<void> {
    console.log('Mailing');
    console.log('lead list length', this._leadsList.length)
    const lead = this._leadsList.pop();
    if (!lead) return;

    lead.bot = this._bot;

    const msg = await ai.start(lead.dialogData);
    lead.resId = msg.id;
    await db.manager.save(lead);

    try {
      await this._client.sendMessage(lead.username, {
        message: msg.text,
      });
    } catch (error) {
      console.error(error);
      this._bot.state = BotState.POSSIBLE_SPAMBLOCK;
    }
    this._bot.lastMessage = new Date();
    await db.manager.save(this._bot);

    if (this.state === BotState.MAILING) {
      lead.sent = true;
      lead.amoId = String(
        (
          await amo.addDeal([
            {
              pipeline_id: 9442090,
              status_id: StatusID.Unknown,
              name: lead.username,
              custom_fields_values: [
                {
                  field_id: CustomFieldID.INN,
                  values: [
                    {
                      value: lead.inn,
                    },
                  ],
                },
                {
                  field_id: CustomFieldID.Phone,
                  values: [
                    {
                      value: lead.phone,
                    },
                  ],
                },
                {
                  field_id: CustomFieldID.Username,
                  values: [
                    {
                      value: lead.username,
                    },
                  ],
                },
                {
                  field_id: CustomFieldID.Dialog,
                  values: [
                    {
                      value: msg.text,
                    },
                  ],
                },
              ],
            },
          ])
        ).id,
      );
      await db.manager.save(lead);
    }
  }

  public async update(): Promise<void> {
    const res = await db
      .createQueryBuilder(Bot, "bot")
      .select()
      .where("bot.phone = :phone", {
        phone: this._phone,
      })
      .getOne();
    if (!res) throw new Error(this._phone);
    this._bot = res;
  }

  public async unblock(): Promise<void> {
    if (
      this.state === BotState.POSSIBLE_SPAMBLOCK ||
      this.state === BotState.CONFIRMED_SPAMBLOCK
    ) {
      this._bot.state = BotState.IDLE;
      await db.manager.save(this._bot);
    }
  }

  public async confirmBlock(): Promise<void> {
    if (
      this.state === BotState.POSSIBLE_SPAMBLOCK ||
      this.state === BotState.IDLE
    ) {
      this._bot.state = BotState.CONFIRMED_SPAMBLOCK;
      await db.manager.save(this._bot);
    }
  }
}
