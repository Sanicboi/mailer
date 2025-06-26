import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Bot } from "./bot";
import { Mailing } from "./mailing";
import { Lead } from "./lead";
import { LeadBase } from "./leadBase";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  name: string;

  @OneToMany(() => Bot, (bot) => bot.user)
  bots: Bot[];

  @OneToMany(() => Mailing, (mailing) => mailing.user)
  mailings: Mailing[];

  @OneToMany(() => Lead, (lead) => lead.user)
  leads: Lead[];

  @OneToMany(() => LeadBase, (leadBase) => leadBase.user)
  leadBases: LeadBase[];

  @Column("text", {
    default: "",
  })
  prompt: string;

  @Column("bytea", {
    default: Buffer.from(""),
  })
  kb: Buffer;
}
