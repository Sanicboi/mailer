import "dotenv/config";
import { AppDataSource } from "./data-source";
import { TelegramClient } from "telegram";
import { Manager } from "./manager";
import { AI } from "./ai";
import express from 'express';

AppDataSource.initialize()
  .then(async () => {


    const app = express();

    app.get('/api/accounts', async (req, res) => {
      
    });

    
    const ai = new AI();

    const clientsManager = new Manager();

    await clientsManager.start();

    app.listen(80);
  })
  .catch((error) => console.log(error));

  