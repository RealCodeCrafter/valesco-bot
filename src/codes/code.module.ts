import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Code } from './code.entity';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Code])],
  providers: [CodeService],
  controllers: [CodeController],
  exports: [CodeService],
})
export class CodeModule {}