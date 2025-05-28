import OpenAI from "openai";
import fs from "fs";
import path from "path";

export class AI {

  private tools: OpenAI.Responses.Tool[] = [
    {
      type: 'function',
      name: 'saveUser',
      strict: true,
      description: 'сохраняет пользователя в базе данных для дальнейшей работы с ним. Обязательно вызывай ее после окончания диалога',
      parameters: {
        type: "object",
        properties: {
          comment: {
            type: "string",
            description: "Комментарий про диалог с пользователем. Постарайся довольно подробно описать его и дать советы по работе с этим клиентом"
          },
          class: {
            type: "string",
            enum: [
              "A", "B", "C", "D"
            ],
            description: "Тип пользователя. A - Заполнил анкету или заявку. B - Оставил номер телефона или потребовал менеджера. C - перешел в чат-бота или ты ему скинул на него ссылку. D - прочие случаи"
          },
          required: [
            "class", "comment"
          ],
          additionalProperties: false
        }
      }
    }
  ]

  private openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
  });
  private readonly prompt: string = fs.readFileSync(
    path.join(process.cwd(), "prompt.txt"),
    "utf-8",
  );
  private readonly file: Buffer = fs.readFileSync(
    path.join(process.cwd(), 'main.pdf')
  );

  constructor() {
  }

  public async createFirstMessage(): Promise<{
    text: string;
    id: string;
  }> {
    const res = await this.openai.responses.create({
      input: [
        {
          role: 'developer',
          type: 'message',
          content: this.prompt
        },
        {
          role: 'user',
          type: 'message',
          content: [{
            type: 'input_file',
            file_data: `data:application/pdf;base64,${this.file.toString('base64')}`,
            filename: 'main.pdf'
          }, {
            type: 'input_text',
            text: 'Начни диалог'
          }]
        }
      ],
      model: "gpt-4.1",
      store: true,
      temperature: 0.5
    });

    return {
      text: res.output_text,
      id: res.id,
    };
  }

  public async respond(
    msg: string,
    prev: string,
  ): Promise<{
    text: string;
    id: string;
  }> {
    let res = await this.openai.responses.create({
      input: msg,
      model: "gpt-4.1",
      store: true,
      previous_response_id: prev,
      temperature: 1,
      tools: this.tools
    });

    for (const out of res.output) {
      if (out.type === 'function_call') {
        const args: {
          comment: string,
          class: "A" | "B" | "C" | "D"
        } = JSON.parse(out.arguments);


        


        res = await this.openai.responses.create({
          previous_response_id: res.id,
          input: [
            {
              type: 'function_call_output',
              call_id: out.call_id,
              output: "ПОльзователь сохранен. Не говори ему ничего про функцию."
            }
          ],
          model: "gpt-4.1",
          store: true,
          temperature: 0.9
        });
        break;
      }
    }

    return {
      text: res.output_text,
      id: res.id,
    };
  }
}

