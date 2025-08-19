import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Bot } from "./bot";

@Entity()
export class Lead {
  @PrimaryColumn()
  username: string;

  @Column({
    default: "",
  })
  dialogData: string;

  @Column({
    default: "",
  })
  amoId: string;

  @Column({
    nullable: true
  })
  inn: string;

  @Column({
    nullable: true
  })
  phone: string;

  @Column({
    default: false,
  })
  sent: boolean;

  @Column({
    nullable: true,
  })
  resId: string;

  @Column({
    default: false,
  })
  replied: boolean;

  @Column({
    default: false,
  })
  finished: boolean;


  @ManyToOne(() => Bot, (bot) => bot.leads, {
    nullable: true,
  })
  bot: Bot | null;
}
