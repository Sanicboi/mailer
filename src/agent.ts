import { Api, TelegramClient } from "telegram";
import { Bot } from "./entities/bot";
import { db } from "./db";
import { BlockedError } from "./errors";
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
    

    public async markLeads(amount: number): Promise<void> {
        await this.update();
        this._bot.active = true;
        await db.manager.save(this._bot);
        this._leadsList = await db
            .createQueryBuilder(Lead, 'lead')
            .select()
            .where('lead.sent = false')
            .andWhere('lead.resId IS NULL')
            .andWhere('lead.botPhone IS NULL')
            .take(amount)
            .getMany();
        await db
            .createQueryBuilder(Lead, 'lead')
            .update()
            .where('lead.username IN :ids', {
                ids: this._leadsList.map(el => el.username)
            })
            .set({
                bot: this._bot
            })
            .execute();
    }

    public async finish(): Promise<void> {
        await this.stop();
        this._leadsList = [];
    }

    private async callback(e: NewMessageEvent): Promise<void> {
        if (!e.isPrivate) return;
        const fromId: string = e.message.senderId!.toJSON();
        
        const dialogs = await this._client.getDialogs();
        const dialog = dialogs.find(el => el.entity?.id.toJSON() === fromId);
        if (!dialog) return;
        const asUser = dialog.entity as Api.User;

        const lead = await db.manager
            .createQueryBuilder(Lead, 'lead')
            .select()
            .where('lead.username = :username', {
                username: asUser.username
            })
            .andWhere('lead.sent = true')
            .getOne();
        if (!lead) return;

        if (!lead.replied) {
            lead.replied = true;
        }

        const response = await ai.respond(e.message.text, lead.resId);
        lead.resId = response.id;

        await this._client.sendMessage(lead.username, {
            message: response.text
        });
        

        const conversation = await this.getConversation(lead.username, fromId);
        const status = await ai.getStatus(conversation);
        
        await amo.editDeal({
            id: +lead.amoId,
            status_id: amo.getStatusId(status.leadStatus),
            custom_fields_values: [
                {
                    field_id: CustomFieldID.Dialog,
                    values: [{
                        value: conversation
                    }]
                }
            ]
        });

        if (status.dialogueFinished) {
            lead.finished = true;
        }
        await db.manager.save(lead);
        
    }

    private async getConversation(name: string, clId: string): Promise<string> {
        const msgs = await this._client.getMessages(name, {
            reverse: true
        });
        return msgs.map<string>(el => {
            switch (el.senderId?.toJSON()) {
                case clId:
                    return `Пользователь: ${el.text}`;
                default:
                    return `Бот: ${el.text}`;
            }
        }).join('\n\n');
    }

    public get toMail(): number {
        return this._leadsList.length;
    }

    public async mail(): Promise<void> {
        const lead = this._leadsList.pop();
        if (!lead) return;
        lead.bot = this._bot;
        const msg = await ai.start(lead.dialogData);
        lead.resId = msg.id;
        await db.manager.save(lead);
        await this._client.sendMessage(lead.username, {
            message: msg.text
        });
        lead.sent = true;
        lead.amoId = String((await amo.addDeal([{
            pipeline_id: 9442090,
            status_id: StatusID.Unknown,
            name: lead.username,
            custom_fields_values: [
                {
                    field_id: CustomFieldID.INN,
                    values: [{
                        value: lead.inn
                    }]
                },
                {
                    field_id: CustomFieldID.Phone,
                    values: [{
                        value: lead.phone
                    }]
                },
                {
                    field_id: CustomFieldID.Username,
                    values: [{
                        value: lead.username
                    }]
                },
                {
                    field_id: CustomFieldID.Dialog,
                    values: [{
                        value: msg.text
                    }]
                }
            ]
        }])).id);
        await db.manager.save(lead);
        this._bot.lastMessage = new Date();
        await db.manager.save(this._bot);
    }

    public async save() {
        const bot = new Bot();
        bot.active = false;
        bot.blocked = false;
        bot.phone = this._phone;
        bot.token = this._client.session.save()!;
        await db.manager.save(bot);
        this._bot = bot;
    }

    constructor(phone: string, token?: string) {
        this._phone = phone;
        this._client = new TelegramClient(
            new StringSession(token ?? ""),
            +process.env.TG_API_ID!,
            process.env.TG_API_HASH!,
            {}
        );
    }

    public async connect(): Promise<void> {
        await this._client.connect();
        this._client.addEventHandler((e) => this.callback(e), new NewMessage());
    }

    public async sendCode(): Promise<void> {
        const res = await this._client.sendCode({
            apiHash: process.env.TG_API_HASH!,
            apiId: +process.env.TG_API_ID!
        }, this._phone);
        this._hash = res.phoneCodeHash;
    }

    public async login(code: string): Promise<void> {
        await this._client.invoke(new Api.auth.SignIn({
            phoneCode: code,
            phoneCodeHash: this._hash,
            phoneNumber: this._phone
        }));
        this._hash = '';
    }

    public async stop(): Promise<void> {
        if (this._bot.active) {
            this._bot.active = false;
            await db.manager.save(this._bot);
        }
    }

    public get isActive(): boolean {
        return this._bot.active;
    }

    public get lastMessage(): Date {
        return this._bot.lastMessage;
    }

    public async update(): Promise<void> {
        const res = await db
            .createQueryBuilder(Bot, 'bot')
            .select()
            .where('bot.phone = :phone', {
                phone: this._phone
            })
            .andWhere('bot.blocked = false')
            .getOne();
        if (!res) throw new BlockedError(this._phone);
        this._bot = res;
    }
}