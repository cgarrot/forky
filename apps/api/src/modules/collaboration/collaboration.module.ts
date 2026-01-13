import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NodesModule } from '../nodes/nodes.module';
import { ProjectsModule } from '../projects/projects.module';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { WsAuthGuard } from './guards/ws-auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET as string }),
    ProjectsModule,
    forwardRef(() => NodesModule),
  ],
  providers: [CollaborationGateway, CollaborationService, WsAuthGuard],
  exports: [CollaborationService],
})
export class CollaborationModule {}
