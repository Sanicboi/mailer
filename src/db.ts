import { DataSource } from "typeorm";
import { Bot } from "./entities/bot";
import { Lead } from "./entities/lead";
import { LeadBase } from "./entities/leadBase";
import { User } from "./entities/user";
import { Mailing } from "./entities/mailing";

export const db = new DataSource({
  type: "postgres",
  username: "test",
  password: "test",
  database: "test",
  entities: [Bot, Lead, LeadBase, User, Mailing],
  host: "postgres",
  port: 5432,
  logging: true,
  synchronize: true,
});

export const manager = db.manager;
