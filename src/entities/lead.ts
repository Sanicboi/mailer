import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { LeadBase } from "./leadBase";
import { User } from "./user";
import { Mailing } from "./mailing";
import { Bot } from "./bot";

@Entity()
export class Lead {
  @PrimaryColumn()
  username: string;

  @Column({
    nullable: true,
  })
  phone: string;

  @Column({
    default: "",
  })
  data: string;

  @Column({
    default: false,
  })
  sent: boolean;

  @Column({
    nullable: true,
  })
  amoId: number;

  @Column({
    nullable: true,
  })
  previousResId: string;

  @Column({
    default: false,
  })
  replied: boolean;

  @ManyToOne(() => LeadBase, (leadBase) => leadBase.leads)
  leadBase: LeadBase;

  @ManyToOne(() => User, (user) => user.leads)
  user: User;

  @ManyToOne(() => Mailing, (mailing) => mailing.leads, {
    nullable: true,
  })
  mailing: Mailing;

  @ManyToOne(() => Bot, (bot) => bot.leads, {
    nullable: true,
  })
  bot: Bot;

  @Column({
    default: ''
  })
  inn: string;
}
