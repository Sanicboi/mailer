import OpenAI from "openai";
import { z } from "zod";
import {zodTextFormat} from 'openai/helpers/zod';


const Determination = z.object({
    type: z.enum(['china', 'not-china', 'not-wb', 'unclear'])
});


export class AI {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
  });

  constructor(private readonly prompt: string) {}

  public async createFirstMessage(data: string): Promise<{
    text: string;
    id: string;
  }> {
    const res = await this.openai.responses.create({
      instructions: this.prompt,
      input: [
        {
          role: "user",
          type: "message",
          content: [
            {
              type: "input_text",
              text: `начни диалог. Вот данные о клиенте: ${data}`,
            },
          ],
        },
      ],
      model: "gpt-4.1-mini",
      store: true,
    });

    return {
      text: res.output_text,
      id: res.id,
    };
  }

  public async respond(
    msg: string,
    prev: string,
    name: string,
  ): Promise<{
    text: string;
    id: string;
  }> {
    let res = await this.openai.responses.create({
      input: msg,
      model: "gpt-4o",
      store: true,
      previous_response_id: prev,
      instructions: `Тебя зовут: ${name}\n\n` + this.prompt,
    });

    return {
      text: res.output_text,
      id: res.id,
    };
  }

  public async determine(dialog: string): Promise<'china' | 'not-china' | 'not-wb' | 'unclear'> {
    const res = await this.openai.responses.parse({
      model: 'gpt-4.1-nano',
      input: dialog,
      instructions: 'Ты -менеджер по продажам. Тебе будет дан диалог менеджера и клиента. Определи, к какой категории относится клиент (продает в китае, продает не в китае, не продает на вб, неизвестно).',
      text: {
        format: zodTextFormat(Determination, 'result')
      },
      store: false,
    });
    if (!res.output_parsed) throw new Error("Could not parse");
    return res.output_parsed.type;
  }
}
