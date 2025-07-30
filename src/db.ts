import { DataSource } from "typeorm";
import { Bot } from "./entities/bot";
import { Lead } from "./entities/lead";

export const db = new DataSource({
  type: "postgres",
  username: "test",
  password: "test",
  database: "test",
  entities: [Bot, Lead],
  host: "postgres",
  port: 5432,
  logging: true,
  synchronize: true,
});

export const manager = db.manager;
