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

  constructor() {
    console.log(this.prompt);
  }

  public async createFirstMessage(data: string): Promise<{
    text: string;
    id: string;
  }> {
    const res = await this.openai.responses.create({
      instructions: this.prompt,
      input: [
        {
          role: 'user',
          type: 'message',
          content: [{
            type: 'input_text',
            text: `начни диалог. Вот данные о клиенте: ${data}`
          }]
        }
      ],
      model: "gpt-4o",
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
  ): Promise<{
    text: string;
    id: string;
  }> {
    let res = await this.openai.responses.create({
      input: msg,
      model: "gpt-4o",
      store: true,
      previous_response_id: prev,
      instructions: this.prompt
      // tools: this.tools
    });


    return {
      text: res.output_text,
      id: res.id,
    };
  }
}

