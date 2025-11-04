import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('codes')
export class Code {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ default: false })
  used: boolean;

  @ManyToOne(() => User, (user) => user.codes, { 
    nullable: true,
    onDelete: 'CASCADE',
  })
  user: User;
}
