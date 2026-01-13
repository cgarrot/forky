import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Put,
  Sse,
  UseGuards,
} from '@nestjs/common'
import { map, type Observable } from 'rxjs'
import { GenerateNodeDto } from './dto/generate-node.dto'
import { UpdateNodeDto } from './dto/update-node.dto'
import { NodeGenerationService } from './node-generation.service'
import { NodesService } from './nodes.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { NodeAccessGuard } from '../../common/guards/node-access.guard'

@Controller('nodes')
@UseGuards(JwtAuthGuard)
export class NodesRootController {
  constructor(
    private readonly nodesService: NodesService,
    private readonly generationService: NodeGenerationService
  ) {}

  @Get(':id')
  @UseGuards(NodeAccessGuard)
  getNode(@Param('id') id: string) {
    return this.nodesService.getById(id)
  }

  @Put(':id')
  @UseGuards(NodeAccessGuard)
  updateNode(@Param('id') id: string, @Body() body: UpdateNodeDto) {
    return this.nodesService.update(id, body)
  }

  @Post(':id/generate')
  @UseGuards(NodeAccessGuard)
  startGeneration(@Param('id') id: string, @Body() body: GenerateNodeDto) {
    return this.generationService.startGeneration(id, body)
  }

  @Sse(':id/generate/:streamId')
  @UseGuards(NodeAccessGuard)
  streamGeneration(
    @Param('streamId') streamId: string
  ): Observable<MessageEvent> {
    const stream = this.generationService.getStream(streamId)
    if (!stream) {
      throw new NotFoundException('Stream not found')
    }

    return stream.pipe(map((data) => ({ data } as MessageEvent)))
  }

  @Post(':id/generate/cancel')
  @UseGuards(NodeAccessGuard)
  cancelGeneration(@Param('id') id: string) {
    return this.generationService.cancel(id)
  }

  @Post(':id/cascade')
  @UseGuards(NodeAccessGuard)
  cascadeUpdate(@Param('id') id: string) {
    return this.generationService.cascade(id)
  }

  @Delete(':id')
  @UseGuards(NodeAccessGuard)
  @HttpCode(204)
  async deleteNode(@Param('id') id: string): Promise<void> {
    await this.nodesService.delete(id)
  }
}
