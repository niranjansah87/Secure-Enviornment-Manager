import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import type { JwtPayload } from '@sem/types';

class AuditQueryDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() actor_id?: string;
  @IsOptional() @IsString() resource_type?: string;
  @IsOptional() @IsString() resource_id?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async query(@CurrentUser() user: JwtPayload, @Query() query: AuditQueryDto) {
    const result = await this.auditService.query(user.org, {
      action: query.action,
      actorId: query.actor_id,
      resourceType: query.resource_type,
      resourceId: query.resource_id,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      success: true,
      data: result.events.map((e) => ({
        id: e.id,
        occurred_at: e.occurredAt,
        actor_id: e.actorId,
        actor_type: e.actorType,
        action: e.action,
        resource_type: e.resourceType,
        resource_id: e.resourceId,
        metadata: e.metadata,
        ip: e.ip,
      })),
      pagination: { total: result.total, limit: result.limit, offset: result.offset },
    };
  }
}
