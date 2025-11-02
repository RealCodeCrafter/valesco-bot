import { Code } from 'src/codes/code.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  chatId: number;

  @Column()
  name: string;

  @Column({nullable: true})
  surname: string;

  @Column({nullable: true})
  phone: string;

  @Column({ default: 'uz' })
  language: string;

  @Column({ default: false })
  registered: boolean;

  @CreateDateColumn()
  createdAt: Date;
  
  @OneToMany(() => Code, (code) => code.user)
  codes: Code[];
}