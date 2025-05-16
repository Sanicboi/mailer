import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  ManyToOne,
} from "typeorm";
import { Bot } from "./Bot";

@Entity()
export class User {
  @PrimaryColumn()
  username: string;

  @Column("text", {
    nullable: true,
  })
  lastMsgId: string | null;

  @ManyToOne(() => Bot, (bot) => bot.users)
  bot: Bot;
}
