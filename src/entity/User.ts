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

  @Column('text', {
    default: ''
  })
  additionalData: string;

  @Column({
    default: false
  })
  replied: boolean;

  @Column({
    default: false
  })
  sent: boolean;

  @ManyToOne(() => Bot, (bot) => bot.users)
  bot: Bot;
}
