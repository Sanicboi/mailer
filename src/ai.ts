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

  constructor() {
  }

  public async createFirstMessage(): Promise<{
    text: string;
    id: string;
  }> {
    const res = await this.openai.responses.create({
      input: "Начни диалог",
      model: "gpt-4o",
      instructions: this.prompt,
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
      model: "gpt-4.1-nano",
      instructions: this.prompt,
      store: true,
      previous_response_id: prev,
    });

    return {
      text: res.output_text,
      id: res.id,
    };
  }
}
