import { Controller, Get, Post, Param, ParseUUIDPipe, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@sem/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { SecretsService } from '../secrets/secrets.service';

@Controller('api/v1/projects/:projectId/environments/:environmentId/history')
export class EnvironmentHistoryController {
  constructor(
    private readonly snapshots: SnapshotsService,
    private readonly secrets: SecretsService,
  ) {}

  @Get()
  @RequireScopes('history:read')
  async list(@CurrentUser() user: JwtPayload, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('environmentId', ParseUUIDPipe) environmentId: string) {
    return { success: true, data: await this.snapshots.list(environmentId, projectId, user.org) };
  }

  @Get(':snapshotId')
  @RequireScopes('history:read', 'secrets:read')
  async get(@CurrentUser() user: JwtPayload, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('environmentId', ParseUUIDPipe) environmentId: string, @Param('snapshotId', ParseUUIDPipe) snapshotId: string) {
    const { snapshot, variables } = await this.snapshots.get(environmentId, projectId, user.org, snapshotId);
    return { success: true, data: { id: snapshot.id, action: snapshot.action, description: snapshot.description, actor_id: snapshot.actorId, created_at: snapshot.createdAt, variables } };
  }

  @Post(':snapshotId/rollback')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('history:read', 'secrets:write')
  async rollback(@CurrentUser() user: JwtPayload, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('environmentId', ParseUUIDPipe) environmentId: string, @Param('snapshotId', ParseUUIDPipe) snapshotId: string, @Req() req: FastifyRequest) {
    const { variables } = await this.snapshots.get(environmentId, projectId, user.org, snapshotId);
    const results = await this.secrets.bulkReplace(
      environmentId,
      projectId,
      user.org,
      Object.entries(variables).map(([key, value]) => ({ key, value, is_sensitive: true })),
      user.sub,
      req.ip,
      true,
    );
    return { success: true, data: { restored: results.length, snapshot_id: snapshotId } };
  }
}
