import OpenAI from "openai";
import fs from 'fs';
import path from "path";
import { z } from "zod";
import {zodTextFormat} from 'openai/helpers/zod';

class Response {
  constructor(public readonly id: string, public readonly text: string) {}
}

const StatusFormat = z.object({
  leadStatus: z.enum(['china', 'not-china', 'not-wb', 'unknown']),
  dialogueFinished: z.boolean()
})

const INNFormat = z.object({
  inn: z.string()
});


class AI {
  private _openai: OpenAI;
  public readonly prompt = fs.readFileSync(path.join(process.cwd(), 'prompt.txt'), 'utf-8');

  constructor() {
    if (!process.env.OPENAI_TOKEN) throw new Error("Env not set");
    this._openai = new OpenAI({
      apiKey: process.env.OPENAI_TOKEN,
    });
  }

  public async start(data: string): Promise<Response> {
    const res = await this._openai.responses.create({
      input: `Начни диалог. Данные о клиенте: ${data}`,
      model: 'gpt-4.1-mini',
      store: true,
      instructions: this.prompt,
    });
    return new Response(res.id, res.output_text);
  }

  public async respond(text: string, prevId?: string): Promise<Response> {
    const res = await this._openai.responses.create({
      input: text,
      model: 'gpt-4.1-mini',
      store: true,
      instructions: this.prompt,
      previous_response_id: prevId
    });
    return new Response(res.id, res.output_text);
  }
  
  public async getStatus(dialogue: string): Promise<{
    leadStatus: 'china' | 'not-china' | 'not-wb' | 'unknown',
    dialogueFinished: boolean
  }> {
    const res = await this._openai.responses.parse({
      model: 'gpt-4.1',
      input: dialogue,
      instructions: 'Ты - менеджер по продажам. тебе будет дан диалог с клиентом. Тебе надо будет определить статус лида и статус диалога. Лидо может либо продавать на Вайлдберриз (ВБ) через Китай, либо продавать на ВБ не через Китай, а через другую страну, либо не продавать на ВБ вообще. Для остальных случаев используй статус "неизвестно". Также определи, закончен ли диалог с пользователем (т.е. закончил ли его менеджер или нет)',
      store: false,
      text: {
        format: zodTextFormat(StatusFormat, 'result')
      }
    });
    if (!res.output_parsed) throw new Error("Could not parse");
    return res.output_parsed;
  }


  public async getINN(name: string): Promise<string> {
    const res = await this._openai.responses.parse({
      model: 'gpt-4o-search-preview',
      tools: [
        {type: 'web_search_preview'}
      ],
      input: `Найди инн данного предпринимателя: ИП ${name}`,
      store: false,
      text: {
        format: zodTextFormat(INNFormat, 'result')
      }
    });
    if (!res.output_parsed) throw new Error("Инн не найден");
    return res.output_parsed.inn;
  }
}


export const ai = new AI();