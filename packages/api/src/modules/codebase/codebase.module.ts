import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CodebaseController } from './codebase.controller';

@Module({
  imports: [AuthModule],
  controllers: [CodebaseController],
})
export class CodebaseModule {}
