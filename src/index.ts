import "dotenv/config";
import { AppDataSource } from "./data-source";
import { TelegramClient } from "telegram";
import { Manager } from "./manager";
import express from 'express';
import botRouter from './api/bots';
import exportsRouter from './api/exports';
import groupsRouter from './api/groups';
import mailingsRouter from './api/mailings';
import usersRouter from './api/users';

AppDataSource.initialize()
  .then(async () => {


    const app = express();

    app.use(express.json());

    
    // const ai = new AI();

    // const clientsManager = new Manager();

    // await clientsManager.start();

    app.use(botRouter);
    app.use(exportsRouter);
    app.use(groupsRouter);
    app.use(mailingsRouter);
    app.use(usersRouter);

    app.listen(80);
  })
  .catch((error) => console.log(error));

  