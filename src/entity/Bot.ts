import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Bot {
  @PrimaryColumn()
  token: string;

  @Column({
    default: '',
    nullable: true
  })
  username: string;

  @OneToMany(() => User, (user) => user.bot)
  users: User[];

  @Column({
    default: false,
  })
  blocked: boolean;
}
