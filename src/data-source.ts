import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Bot } from "./entity/Bot";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "test",
  password: "test",
  database: "test",
  synchronize: true,
  logging: false,
  entities: [User, Bot],
  migrations: [],
  subscribers: [],
});
