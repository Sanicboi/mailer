import { Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./user";
import { Mailing } from "./mailing";
import { Lead } from "./lead";



@Entity()
export class Bot {
    @PrimaryColumn()
    phone: string;

    @Column({
        nullable: true
    })
    token: string;
    
    @Column({
        default: false
    })
    blocked: boolean;

    @Column({
        nullable: true
    })
    lastMessage: Date;

    @Column({
        default: false
    })
    loggedIn: boolean;

    @Column({
        default: ''
    })
    codeHash: string;

    @ManyToOne(() => User, (user) => user.bots)
    user: User;

    @ManyToMany(() => Mailing, (mailing) => mailing.bots)
    mailings: Mailing[];
    

    @OneToMany(() => Lead, (lead) => lead.bot)
    leads: Lead[];
}