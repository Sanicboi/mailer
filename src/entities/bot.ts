import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { Lead } from "./lead";

@Entity()
export class Bot {
  @PrimaryColumn()
  phone: string;

  @Column({
    nullable: true,
  })
  token: string;

  @Column({
    default: false,
  })
  blocked: boolean;

  @Column({
    default: false
  })
  active: boolean;

  @Column({
    nullable: true,
  })
  lastMessage: Date;

  @OneToMany(() => Lead, (lead) => lead.bot)
  leads: Lead[];
}
