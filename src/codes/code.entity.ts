import { User } from 'src/users/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('codes')
export class Code {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ default: false })
  used: boolean;

  @Column({ nullable: true })
  usedBy: number;

  @ManyToOne(() => User, (user) => user.codes)
  user: User;
}