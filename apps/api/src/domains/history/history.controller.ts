import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SecretsService } from '../secrets/secrets.service';
import type { JwtPayload } from '@sem/types';

@ApiTags('history')
@ApiBearerAuth()
@Controller('api/v1/projects/:projectId/environments/:environmentId/secrets/:key/history')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HistoryController {
  constructor(private readonly secretsService: SecretsService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('key') key: string,
  ) {
    const versions = await this.secretsService.listVersions(environmentId, projectId, user.org, key);
    return { success: true, data: versions };
  }
}
