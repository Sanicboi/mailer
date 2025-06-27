import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bot } from "./bot";
import { User } from "./user";
import { Lead } from "./lead";
import { LeadBase } from "./leadBase";

@Entity()
export class Mailing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: true,
  })
  active: boolean;

  @ManyToMany(() => Bot, (bot) => bot.mailings)
  @JoinTable()
  bots: Bot[];

  @ManyToOne(() => User, (user) => user.mailings)
  user: User;

  @OneToMany(() => Lead, (lead) => lead.mailing)
  leads: Lead[];

  @ManyToOne(() => LeadBase, (leadBase) => leadBase.mailings)
  leadBase: LeadBase;
}
