import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Code } from './code.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse';

@Injectable()
export class CodeService implements OnModuleInit {
  constructor(
    @InjectRepository(Code)
    private repo: Repository<Code>,
  ) {}

  async onModuleInit() {
    const file = path.join(process.cwd(), 'data', 'codes.csv');
    if (!fs.existsSync(file)) {
      console.log('codes.csv topilmadi: data/codes.csv yarating');
      return;
    }

    const codes: string[] = [];
    const parser = csv.parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
    });

    fs.createReadStream(file)
      .pipe(parser)
      .on('data', (row: any) => {
        const c = (row.code ?? row.Code ?? '').toString().toUpperCase().trim();
        if (c) codes.push(c);
      })
      .on('end', async () => {
        let added = 0;
        for (const code of codes) {
          const exists = await this.repo.findOne({ where: { code } });
          if (!exists) {
            await this.repo.save({ code });
            added++;
          }
        }
        console.log(`${codes.length} ta kod yuklandi, ${added} tasi yangi`);
      })
      .on('error', (err: any) => console.error('CSV oʻqishda xato:', err));
  }

  async isValid(code: string): Promise<boolean> {
    const c = await this.repo.findOne({ where: { code, used: false } });
    return !!c;
  }

  async markUsed(code: string, userId: number): Promise<void> {
    await this.repo.update({ code }, { used: true, user: {id: userId} });
  }

  async findAll(): Promise<Code[]> {
    return this.repo.find();
  }

  async stats() {
    const total = await this.repo.count();
    const used = await this.repo.count({ where: { used: true } });
    return { total, used, free: total - used };
  }
}
