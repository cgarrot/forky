import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { EdgesService } from './edges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EdgeAccessGuard } from '../../common/guards/edge-access.guard';

@Controller('edges')
@UseGuards(JwtAuthGuard)
export class EdgesRootController {
  constructor(private readonly edgesService: EdgesService) {}

  @Delete(':id')
  @UseGuards(EdgeAccessGuard)
  @HttpCode(204)
  async deleteEdge(@Param('id') id: string): Promise<void> {
    await this.edgesService.delete(id);
  }
}
