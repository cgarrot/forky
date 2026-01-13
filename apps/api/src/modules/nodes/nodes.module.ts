import { Module, forwardRef } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CollaborationModule } from '../collaboration/collaboration.module'
import { LlmModule } from '../llm/llm.module'
import { NodesController } from './nodes.controller'
import { NodesRootController } from './nodes-root.controller'
import { NodeGenerationService } from './node-generation.service'
import { NodeGenerationStreamsService } from './node-generation-streams.service'
import { NodesService } from './nodes.service'

@Module({
  imports: [AuthModule, LlmModule, forwardRef(() => CollaborationModule)],
  controllers: [NodesController, NodesRootController],
  providers: [NodesService, NodeGenerationStreamsService, NodeGenerationService],
  exports: [NodesService],
})
export class NodesModule {}
