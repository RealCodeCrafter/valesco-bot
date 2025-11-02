import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../users/user.module';
import { CodeModule } from '../codes/code.module';

@Module({
  imports: [UserModule, CodeModule],
  providers: [BotService],
})
export class BotModule {}