import dayjs from "dayjs";
import { Agent } from "./agent";
import { db } from "./db";
import { Bot, BotState } from "./entities/bot";
import { Lead } from "./entities/lead";
import { BlockedError } from "./errors";
import { wait } from "./utils";


class Mailer {


    private _agents: Agent[] = [];
    private _currentPhone: string = '';

    constructor() {

    }

    public async init(): Promise<void> {
        const ags = await db
            .createQueryBuilder(Bot, 'agent')
            .where('agent.state <> :blocked AND agent.state <> :loggingIn', {
                blocked: BotState.BANNED,
                loggingIn: BotState.LOGGING_IN
            })
            .select()
            .getMany();
        for (const ag of ags) {
            this._agents.push(new Agent(ag.phone, ag.token));
            await this._agents[this._agents.length - 1].connect();
            await this._agents[this._agents.length - 1].update();
        }
    }

    public async addAgent(phone: string): Promise<void> {
        const agent = new Agent(phone);
        await agent.connect();
        await agent.sendCode();
        this._currentPhone = agent.phone;
    } 

    public async loginAgent(code: string): Promise<void> {
        if (!this._currentPhone) return;
        const agent = this._agents.find(el => el.phone === this._currentPhone);
        if (!agent) return;
        await agent.login(code);
        await agent.create();
        this._currentPhone = '';
    }

    public async mail(numAgents: number, numPerAgent: number): Promise<void> {
        this._agents.sort((a, b) => a.lastMessage.getTime() - b.lastMessage.getTime());
        const take = Math.min(numAgents, this._agents.length);
        for (let i = 0; i < take; i++) {
            await this._agents[i].markLeads(numPerAgent);
        }

        let i = 0;
        while (this._agents[i].toMail > 0) {
            if (this._agents[i].state !== BotState.MAILING) break;
            await this._agents[i].mail();
            i = (i + 1) % this._agents.length;
            if (i === 0) await wait(5 * 60);
        }

        for (let i = 0; i < take; i++) {
            await this._agents[i].finish();
        }

        await db
            .createQueryBuilder(Lead, 'lead')
            .update()
            .where('lead.sent = false')
            .andWhere('lead.resId IS NULL')
            .andWhere('lead.botPhone IS NOT NULL')
            .set({
                bot: null
            })
            .execute();
        
    }

    public async stop() {
        for (const ag of this._agents) {
            await ag.finish();
        }
    }

    public getAgents(): {
        phone: string,
        state: BotState
    }[] {
        return this._agents.map(el => ({
            phone: el.phone,
            state: el.state
        }));
    }

    public async confirm(phone: string): Promise<void> {
        const ag = this._agents.find(el => el.phone === phone);
        if (!ag) return;
        await ag.confirmBlock();
    }

    public async deny(phone: string): Promise<void> {
        const ag = this._agents.find(el => el.phone === phone);
        if (!ag) return;
        await ag.unblock();
    }

}


export const mailer = new Mailer();