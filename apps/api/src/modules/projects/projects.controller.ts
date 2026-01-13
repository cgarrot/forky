import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(
    @CurrentUser() user: { sub: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('sort') sort?: 'createdAt' | 'updatedAt' | 'name',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.projectsService.list({
      userId: user.sub,
      page,
      limit,
      search,
      sort,
      order,
    });
  }

  @Post()
  createProject(
    @CurrentUser() user: { sub: string },
    @Body() body: CreateProjectDto,
  ) {
    return this.projectsService.create(user.sub, body);
  }

  @Get(':id')
  @UseGuards(ProjectAccessGuard)
  getProject(@Param('id') id: string) {
    return this.projectsService.getById(id);
  }

  @Put(':id')
  @UseGuards(ProjectAccessGuard)
  updateProject(@Param('id') id: string, @Body() body: UpdateProjectDto) {
    return this.projectsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(ProjectAccessGuard)
  @HttpCode(204)
  async deleteProject(@Param('id') id: string): Promise<void> {
    await this.projectsService.delete(id);
  }

  @Get(':id/members')
  @UseGuards(ProjectAccessGuard)
  listMembers(@Param('id') id: string) {
    return this.projectsService.listMembers(id);
  }

  @Post(':id/members')
  @UseGuards(ProjectAccessGuard)
  inviteMember(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: InviteMemberDto,
  ) {
    return this.projectsService.inviteMember({
      projectId: id,
      actorId: user.sub,
      email: body.email,
      role: body.role,
    });
  }

  @Delete(':id/members/:memberId')
  @UseGuards(ProjectAccessGuard)
  @HttpCode(204)
  async removeMember(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.projectsService.removeMember({
      projectId: id,
      actorId: user.sub,
      memberId,
    });
  }

  @Patch(':id/members/:memberId')
  @UseGuards(ProjectAccessGuard)
  updateMemberRole(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleDto,
  ) {
    return this.projectsService.updateMemberRole({
      projectId: id,
      actorId: user.sub,
      memberId,
      role: body.role,
    });
  }
}
