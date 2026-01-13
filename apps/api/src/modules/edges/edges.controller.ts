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
} from '@nestjs/common';
import { CreateEdgeDto } from './dto/create-edge.dto';
import { EdgesService } from './edges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';

@Controller('projects/:projectId/edges')
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
export class EdgesController {
  constructor(private readonly edgesService: EdgesService) {}

  @Get()
  listEdges(
    @Param('projectId') projectId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ) {
    return this.edgesService.list({ projectId, page, limit });
  }

  @Post()
  createEdge(
    @Param('projectId') projectId: string,
    @Body() body: CreateEdgeDto,
  ) {
    return this.edgesService.create(projectId, body);
  }
}
