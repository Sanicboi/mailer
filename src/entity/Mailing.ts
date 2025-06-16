import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Bot } from "./Bot";
import { User } from "./User";


@Entity()
export class Mailing {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToMany(() => Bot, (bot) => bot.mailings)
    bots: Bot[];

    @Column({
        default: true
    })
    active: boolean;

    @OneToMany(() => User, (user) => user.mailing)
    users: User[];

}