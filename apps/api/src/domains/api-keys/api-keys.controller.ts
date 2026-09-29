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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeysService, API_KEY_SCOPES } from './api-keys.service';
import type { JwtPayload } from '@sem/types';

class CreateApiKeyDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsArray() @IsString({ each: true }) scopes!: string[];
  @IsOptional() @IsUUID() user_id?: string;
  @IsOptional() @IsDateString() expires_at?: string;
}

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api/v1/api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const keys = await this.apiKeysService.findAll(user.org);
    return { success: true, data: keys };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateApiKeyDto,
    @Req() req: FastifyRequest,
  ) {
    // Validate requested scopes against the system allowlist
    const unknownScopes = body.scopes.filter(
      (s) => !(API_KEY_SCOPES as readonly string[]).includes(s),
    );
    if (unknownScopes.length > 0) {
      throw new ForbiddenException({
        code: 'INVALID_SCOPES',
        message: `Unknown scopes: ${unknownScopes.join(', ')}`,
      });
    }

    const { apiKey, rawKey } = await this.apiKeysService.create({
      orgId: user.org,
      name: body.name,
      scopes: body.scopes,
      userId: body.user_id,
      expiresAt: body.expires_at ? new Date(body.expires_at) : undefined,
      createdBy: user.sub,
      callerRole: user.role,
      callerScopes: user.scopes,
      ip: req.ip,
    });

    return {
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned at creation
        key_prefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expires_at: apiKey.expiresAt,
        created_at: apiKey.createdAt,
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: FastifyRequest,
  ) {
    await this.apiKeysService.revoke(id, user.org, user.sub, req.ip);
    return { success: true, data: { message: 'API key revoked' } };
  }
}
