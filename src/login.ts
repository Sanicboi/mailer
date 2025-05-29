import { StringSession } from "telegram/sessions";
import { AppDataSource } from "./data-source";
import "dotenv/config";
// @ts-ignore
import input from "input";
import { TelegramClient } from "telegram";
import fs from "fs";
import path from "path";
import { Bot } from "./entity/Bot";

AppDataSource.initialize().then(async () => {
  const numbers = (
    await fs.promises.readFile(
      path.join(process.cwd(), "numbers.temp.txt"),
      "utf-8"
    )
  ).split("\n");
  for (const n of numbers) {
    if (!n) continue;
    const session = new StringSession();
    const client = new TelegramClient(
      session,
      +process.env.TG_API_ID!,
      process.env.TG_API_HASH!,
      {}
    );
    await client.start({
      phoneNumber: n,
      onError(err) {
        console.log(err);
      },
      phoneCode: async () => await input.text("Code:"),
      password: async () => await input.text("Password:")
    });
    const bot = new Bot();
    bot.token = client.session.save()!;
    bot.username = (await client.getMe()).username!;
    await AppDataSource.manager.save(bot);
  }
});
