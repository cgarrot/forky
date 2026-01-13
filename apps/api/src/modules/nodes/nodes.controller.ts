import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CreateNodeDto } from './dto/create-node.dto'
import { CreateNodeBatchDto } from './dto/create-node-batch.dto'
import type { NodeStatus } from './types/node.type'
import { NodesService } from './nodes.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ProjectAccessGuard } from '../../common/guards/project-access.guard'

@Controller('projects/:projectId/nodes')
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  listNodes(
    @Param('projectId') projectId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: NodeStatus,
    @Query('search') search?: string
  ) {
    return this.nodesService.list({ projectId, page, limit, status, search })
  }

  @Post()
  createNode(@Param('projectId') projectId: string, @Body() body: CreateNodeDto) {
    return this.nodesService.create(projectId, body)
  }

  @Post('batch')
  createNodesBatch(
    @Param('projectId') projectId: string,
    @Body() body: CreateNodeBatchDto
  ) {
    return this.nodesService.createBatch(projectId, body.nodes)
  }
}
