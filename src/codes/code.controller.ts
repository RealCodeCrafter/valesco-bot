import { Controller, Get } from '@nestjs/common';
import { CodeService } from './code.service';
import { Code } from './code.entity';

@Controller('codes')
export class CodeController {
  constructor(private readonly service: CodeService) {}

  @Get()
  findAll(): Promise<Code[]> {
    return this.service.findAll();
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }
}