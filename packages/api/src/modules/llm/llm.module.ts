import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GenerateController } from './generate.controller';
import { GenerateTitleController } from './generate-title.controller';
import { LlmService } from './llm.service';
import { SummarizeController } from './summarize.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    GenerateController,
    GenerateTitleController,
    SummarizeController,
  ],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
