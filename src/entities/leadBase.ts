import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Lead } from "./lead";
import { User } from "./user";
import { Mailing } from "./mailing";

@Entity()
export class LeadBase {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Lead, (lead) => lead.leadBase)
  leads: Lead[];

  @ManyToOne(() => User, (user) => user.leadBases)
  user: User;

  @OneToMany(() => Mailing, (mailing) => mailing.leadBase)
  mailings: Mailing[];
}
