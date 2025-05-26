import OpenAI from "openai";
import fs from "fs";
import path from "path";

export class AI {
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
      model: "gpt-4o",
      store: true,
      temperature: 0.8
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
    const res = await this.openai.responses.create({
      input: msg,
      model: "gpt-4o",
      store: true,
      previous_response_id: prev,
      temperature: 0.8
    });

    return {
      text: res.output_text,
      id: res.id,
    };
  }
}

