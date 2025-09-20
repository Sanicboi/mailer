import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

class Response {
  constructor(
    public readonly id: string,
    public readonly text: string,
  ) {}
}

const StatusFormat = z.object({
  leadStatus: z.enum(["china", "not-china", "not-wb", "unknown"]),
  dialogueFinished: z.boolean(),
});

const INNFormat = z.object({
  inn: z.string(),
});

class AI {
  private _openai: OpenAI;
  public prompt: string = "";
  public fileId: string = "";

  constructor() {
    if (!process.env.OPENAI_TOKEN) throw new Error("Env not set");
    this._openai = new OpenAI({
      apiKey: process.env.OPENAI_TOKEN,
    });
  }

  public async init(): Promise<void> {
    try {
      const data: {
        prompt: string;
        kb: string;
      } = JSON.parse(
        await fs.readFile(path.join(process.cwd(), "config.json"), "utf-8"),
      );
      this.fileId = data.kb;
      this.prompt = data.prompt;
    } catch (error) {
      this.fileId = "";
      this.prompt = "";
      await this.save();
    }
  }

  private async save(): Promise<void> {
    await fs.writeFile(
      path.join(process.cwd(), "config.json"),
      JSON.stringify({
        prompt: this.prompt,
        kb: this.fileId,
      }),
      "utf-8",
    );
  }

  public async setPrompt(val: string): Promise<void> {
    this.prompt = val;
    await this.save();
  }

  public async setKB(val: Buffer): Promise<void> {
    const r = await this._openai.files.create({
      file: new File([val as BlobPart], "main.pdf", {
        type: "application/pdf",
      }),
      purpose: "assistants",
    });
    this.fileId = r.id;
    await this.save();
  }

  public async start(data: string): Promise<Response> {
    const res = await this._openai.responses.create({
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: this.fileId
            },
          ],
        },
      ],
      model: "gpt-4.1-mini",
      store: true,
      instructions: this.prompt,
    });
    return new Response(res.id, res.output_text);
  }

  public async respond(text: string, prevId: string | null): Promise<Response> {
    const res = await this._openai.responses.create({
      input: text,
      model: "gpt-4.1-mini",
      store: true,
      instructions: this.prompt,
      previous_response_id: prevId ?? undefined,
    });
    return new Response(res.id, res.output_text);
  }

  public async getStatus(dialogue: string): Promise<{
    leadStatus: "china" | "not-china" | "not-wb" | "unknown";
    dialogueFinished: boolean;
  }> {
    const res = await this._openai.responses.parse({
      model: "gpt-4.1",
      input: dialogue,
      instructions:
        'Ты - менеджер по продажам. тебе будет дан диалог с клиентом. Тебе надо будет определить статус лида и статус диалога. Лидо может либо продавать на Вайлдберриз (ВБ) через Китай, либо продавать на ВБ не через Китай, а через другую страну, либо не продавать на ВБ вообще. Для остальных случаев используй статус "неизвестно". Также определи, закончен ли диалог с пользователем (т.е. закончил ли его менеджер или нет)',
      store: false,
      text: {
        format: zodTextFormat(StatusFormat, "result"),
      },
    });
    if (!res.output_parsed) throw new Error("Could not parse");
    return res.output_parsed;
  }

  public async getINN(name: string): Promise<string> {
    const res = await this._openai.responses.parse({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" }],
      input: `Найди инн данного предпринимателя: ИП ${name}`,
      store: false,
      text: {
        format: zodTextFormat(INNFormat, "result"),
      },
    });
    if (!res.output_parsed) throw new Error("Инн не найден");
    return res.output_parsed.inn;
  }
}

export const ai = new AI();
