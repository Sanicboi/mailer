import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Bot } from "./Bot";


@Entity()
export class BotGroup {


    @PrimaryGeneratedColumn()
    id: number;

    @OneToMany(() => Bot, (bot) => bot.group)
    bots: Bot[];
}