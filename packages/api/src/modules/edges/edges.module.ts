import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NodesModule } from '../nodes/nodes.module';
import { ProjectsModule } from '../projects/projects.module';
import { EdgesController } from './edges.controller';
import { EdgesRootController } from './edges-root.controller';
import { EdgesService } from './edges.service';

@Module({
  imports: [AuthModule, ProjectsModule, NodesModule],
  controllers: [EdgesController, EdgesRootController],
  providers: [EdgesService],
})
export class EdgesModule {}
