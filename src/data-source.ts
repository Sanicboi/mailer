import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Bot } from "./entity/Bot";
import { Mailing } from "./entity/Mailing";
import { BotGroup } from "./entity/BotGroup";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: "test",
  password: "test",
  database: "test",
  synchronize: true,
  logging: false,
  entities: [User, Bot, Mailing, BotGroup],
  migrations: [],
  subscribers: [],
});
