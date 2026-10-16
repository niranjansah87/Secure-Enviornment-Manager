import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { AnalyticsService } from './analytics.service';
import type { JwtPayload } from '@sem/types';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @RequireScopes('analytics:read')
  async summary(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.analyticsService.getOrgSummary(user.org) };
  }

  @Get('top-actions')
  @RequireScopes('analytics:read')
  async topActions(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.analyticsService.getTopActions(user.org) };
  }
}
