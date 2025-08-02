import { Api, TelegramClient } from "telegram";
import { Bot } from "../entities/bot";
import { StringSession } from "telegram/sessions";
import { NewMessageEvent } from "telegram/events";
import dayjs from "dayjs";
import { wait } from "../utils";
import { manager } from "../db";
import { generateRandomBigInt } from "telegram/Helpers";

export class TGClient {
  private _client: TelegramClient;
  private _me: Api.User | null = null;
  private _hash: string = '';

  constructor(private _bot: Bot) {
    if (!process.env.TG_API_ID || !process.env.TG_API_HASH)
      throw new Error("Env not set");
    this._client = new TelegramClient(
      new StringSession(this._bot.token),
      +process.env.TG_API_ID,
      process.env.TG_API_HASH,
      {}
    );
  }

  public async sendCode(): Promise<void> {
    await this._client.connect();
    const hash = await this._client.sendCode({
      apiHash: process.env.TG_API_HASH!,
      apiId: +process.env.TG_API_ID!
    }, this._bot.phone);
    this._hash = hash.phoneCodeHash;
  }

  public async login(code: string): Promise<void> {
    await this._client.invoke(new Api.auth.SignIn({
      phoneCode: code,
      phoneCodeHash: this._hash,
      phoneNumber: this._bot.phone
    }));
    this._bot.token = this._client.session.save()!;
    this._hash = '';
    await manager.save(this._bot);
  }

  public async init(): Promise<void> {
    await this._client.connect();
    this._me = await this._client.getMe();
  }

  public async destroy(): Promise<void> {
    await this._client.destroy();
  }

  public async sendMessage(to: string, message: string): Promise<void> {
    const nextPossibleMsg = dayjs(this._bot.lastMessage).add(4, 'minutes');
    if (dayjs().isBefore(nextPossibleMsg)) {
      await wait(nextPossibleMsg.diff(dayjs()));
    }
    await this._client.sendMessage(to, {
      message,
    });
    this._bot.lastMessage = new Date();
    await manager.save(this._bot);
  }

  public setCallback(
    cb: (username: string, client: TGClient, text: string) => Promise<void>
  ): void {
    this._client.addEventHandler(async (e: NewMessageEvent) => {
      if (!e.isPrivate) return;
      const dialogs = await this._client.getDialogs();
      const dialog = dialogs.find(
        (el) => el.isUser && el.id?.toJSON() === e.message.senderId?.toJSON()
      );
      if (!dialog) return;
      const user = dialog.entity as Api.User;
      if (!user.username) return;
      try {
        await cb(user.username, this, e.message.text);
      } catch (error) {
        console.error(`CB error: ${error}`);
      }
      
    });
  }

  public async getDialog(username: string): Promise<string> {
    if (!this._me) throw new Error("Not initialized");
    const messages = await this._client.getMessages(username, {
      reverse: true
    });
    const lines = messages.map<string>(el => `${el.sender?.id.toJSON() === this._me?.id.toJSON()}: ${el.text}`);
    return lines.join('\n\n');
  }

  public async reply(to: string, message: string): Promise<void> {
    await this._client.markAsRead(to);
    await this._client.invoke(new Api.messages.SetTyping({
      action: new Api.SendMessageTypingAction(),
      peer: to
    }));
    await this._client.sendMessage(to, {
      message
    });
  }

  public async getUsername(phone: string, fName: string, lName: string): Promise<string> {
    const res = await this._client.invoke(new Api.contacts.ImportContacts({
      contacts: [
        new Api.InputPhoneContact({
          clientId: generateRandomBigInt(),
          firstName: fName,
          lastName: lName,
          phone: phone
        })
      ]
    }));
    if (res.users.length === 0) throw new Error("Could not import");
    const asUser = res.users[0] as Api.User;
    if (!asUser.username) throw new Error("No username");
    return asUser.username;
  }

  public get bot(): Bot {
    return this._bot;
  }

  public get phone(): string {
    return this._me?.phone!;
  }
}
