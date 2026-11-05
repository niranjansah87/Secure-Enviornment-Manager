import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsIn,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SecretsService } from './secrets.service';
import type { JwtPayload } from '@sem/types';

class UpsertSecretDto {
  @IsString() @MaxLength(65535) value!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() is_sensitive?: boolean;
}

class BulkReplaceItemDto {
  @IsString() @MinLength(1) @MaxLength(255) key!: string;
  @IsString() @MaxLength(65535) value!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() is_sensitive?: boolean;
}

class BulkReplaceDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkReplaceItemDto)
  secrets!: BulkReplaceItemDto[];
}

@ApiTags('secrets')
@ApiBearerAuth()
@Controller('api/v1/projects/:projectId/environments/:environmentId/secrets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Get()
  @RequireScopes('secrets:read')
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
  ) {
    const secrets = await this.secretsService.findAll(environmentId, projectId, user.org);
    return { success: true, data: secrets };
  }

  @Put(':key')
  @RequireScopes('secrets:write')
  async upsert(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
    @Body() body: UpsertSecretDto,
    @Req() req: FastifyRequest,
  ) {
    const secret = await this.secretsService.upsert(
      environmentId,
      projectId,
      user.org,
      { key, value: body.value, description: body.description, isSensitive: body.is_sensitive },
      user.sub,
      req.ip,
    );
    return {
      success: true,
      data: {
        id: secret.id,
        key: secret.key,
        description: secret.description,
        is_sensitive: secret.isSensitive,
        version: secret.version,
        created_at: secret.createdAt,
        updated_at: secret.updatedAt,
      },
    };
  }

  @Get(':key/value')
  @RequireScopes('secrets:read')
  async getValue(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
    @Req() req: FastifyRequest,
  ) {
    const value = await this.secretsService.findByKey(
      environmentId,
      projectId,
      user.org,
      key,
      user.sub,
      req.ip,
    );
    return { success: true, data: { key, value } };
  }

  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('secrets:delete')
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
    @Req() req: FastifyRequest,
  ) {
    await this.secretsService.delete(environmentId, projectId, user.org, key, user.sub, req.ip);
    return { success: true, data: { message: 'Secret deleted' } };
  }

  @Get('export')
  @RequireScopes('secrets:export')
  async export(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Query('format') format: string,
    @Req() req: FastifyRequest,
  ) {
    const fmt = ['env', 'json', 'yaml', 'docker'].includes(format)
      ? (format as 'env' | 'json' | 'yaml' | 'docker')
      : 'env';
    const output = await this.secretsService.export(
      environmentId,
      projectId,
      user.org,
      fmt,
      user.sub,
      req.ip,
    );
    return { success: true, data: { format: fmt, content: output } };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('secrets:write')
  async bulkReplace(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Body() body: BulkReplaceDto,
    @Req() req: FastifyRequest,
  ) {
    const results = await this.secretsService.bulkReplace(
      environmentId,
      projectId,
      user.org,
      body.secrets,
      user.sub,
      req.ip,
    );
    return { success: true, data: { count: results.length } };
  }

  @Get(':key/versions')
  @RequireScopes('history:read')
  async listVersions(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
  ) {
    const versions = await this.secretsService.listVersions(environmentId, projectId, user.org, key);
    return { success: true, data: versions };
  }

  @Post(':key/rollback/:version')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('secrets:write')
  async rollback(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.secretsService.rollback(
      environmentId,
      projectId,
      user.org,
      key,
      version,
      user.sub,
      req.ip,
    );
    return { success: true, data: result };
  }
}
