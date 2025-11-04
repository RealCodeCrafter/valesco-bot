import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async findByChatId(chatId: number): Promise<User | null> {
    return this.repo.findOne({ where: { chatId } });
  }

  async upsert(data: Partial<User> & { chatId: number }): Promise<User> {
    const existing = await this.findByChatId(data.chatId);
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(data));
  }

  async findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findCodeUsers(): Promise<User[]> {
  return this.repo
    .createQueryBuilder('user')
    .innerJoin('user.codes', 'code')
    .where('user.registered = :reg', { reg: true })
    .select([
      'user.id',
      'user.name',
      'user.surname',
      'user.phone',
      'user.language',
    ])
    .getMany();


}

async updateLanguage(chatId: number, lang: 'tm' | 'ru') {
  await this.repo.update({ chatId }, { language: lang });
}

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}