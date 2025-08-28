import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { Lead } from "./lead";

export enum BotState {
  IDLE = 1,
  MAILING = 2,
  POSSIBLE_SPAMBLOCK = 3,
  CONFIRMED_SPAMBLOCK = 4,
  BANNED = 5,
  LOGGING_IN = 6
}

@Entity()
export class Bot {
  @PrimaryColumn()
  phone: string;

  @Column({
    nullable: true,
  })
  token: string;

  @Column('enum', {
    enum: BotState,
    default: BotState.IDLE
  })
  state: BotState;

  @Column({
    nullable: true,
  })
  lastMessage: Date;

  @OneToMany(() => Lead, (lead) => lead.bot)
  leads: Lead[];
}
