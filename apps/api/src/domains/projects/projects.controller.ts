import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import type { JwtPayload } from '@sem/types';
import { IsString, MinLength, MaxLength } from 'class-validator';

class CreateProjectDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(100) slug!: string;
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const projects = await this.projectsService.findAll(user.org);
    return { success: true, data: projects.map((p) => this.projectsService.toDto(p)) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireScopes('admin:projects')
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateProjectDto) {
    const project = await this.projectsService.create(user.org, body.name, body.slug);
    return { success: true, data: this.projectsService.toDto(project) };
  }

  @Get(':id')
  async getOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const project = await this.projectsService.findById(id, user.org);
    return { success: true, data: this.projectsService.toDto(project) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('admin:projects')
  async delete(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.projectsService.delete(id, user.org);
    return { success: true, data: { message: 'Project deleted' } };
  }
}
