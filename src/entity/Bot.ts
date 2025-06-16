import { Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { BotGroup } from "./BotGroup";
import { Mailing } from "./Mailing";

@Entity()
export class Bot {
  @PrimaryColumn()
  phone: string;

  @Column({
    default: false
  })
  loggedIn: boolean;

  @Column({
    default: ''
  })
  codeHash: string;

  @Column({
    nullable: true
  })
  token: string;

  @Column({
    nullable: true
  })
  username: string;

  @OneToMany(() => User, (user) => user.bot)
  users: User[];

  @ManyToOne(() => BotGroup, (group) => group.bots)
  group: BotGroup;

  @ManyToMany(() => Mailing, (mailing) => mailing.bots)
  mailings: Mailing[];
  
  
  @Column({
    default: false,
  })
  blocked: boolean;
}
