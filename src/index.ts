import "dotenv/config";
import { AppDataSource } from "./data-source";
import { TelegramClient } from "telegram";
import { Manager } from "./manager";
import { AI } from "./ai";

AppDataSource.initialize()
  .then(async () => {
    const ai = new AI();

    const clientsManager = new Manager();

    await clientsManager.start();
  })
  .catch((error) => console.log(error));
