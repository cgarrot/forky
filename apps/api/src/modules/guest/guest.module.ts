import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProjectsModule } from '../projects/projects.module'
import { GuestController } from './guest.controller'
import { GuestService } from './guest.service'

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [GuestController],
  providers: [GuestService],
})
export class GuestModule {}
