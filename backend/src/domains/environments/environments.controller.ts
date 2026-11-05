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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnvironmentsService } from './environments.service';
import type { JwtPayload } from '@sem/types';
import { IsString, MinLength, MaxLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';

class CreateEnvironmentDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(100) slug!: string;
}

@ApiTags('environments')
@ApiBearerAuth()
@Controller('api/v1/projects/:projectId/environments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const envs = await this.environmentsService.findAll(projectId, user.org);
    return { success: true, data: envs.map((e) => this.environmentsService.toDto(e)) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireScopes('admin:environments')
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: CreateEnvironmentDto,
    @Req() req: FastifyRequest,
  ) {
    const env = await this.environmentsService.create(projectId, user.org, body.name, body.slug, user.sub, req.ip);
    return { success: true, data: this.environmentsService.toDto(env) };
  }

  @Get(':id')
  async getOne(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const env = await this.environmentsService.findById(id, projectId, user.org);
    return { success: true, data: this.environmentsService.toDto(env) };
  }

  @Get(':id/compare/:targetId')
  @RequireScopes('secrets:read')
  async compare(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return { success: true, data: await this.environmentsService.compare(id, targetId, projectId, user.org) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('admin:environments')
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.environmentsService.delete(id, projectId, user.org, user.sub, req.ip);
    return { success: true, data: { message: 'Environment deleted' } };
  }
}
