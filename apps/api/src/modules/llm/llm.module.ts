import { Module } from '@nestjs/common';
import { GenerateTitleController } from './generate-title.controller';
import { AuthModule } from '../auth/auth.module';
import { LlmService } from './llm.service';

@Module({
  imports: [AuthModule],
  controllers: [GenerateTitleController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
