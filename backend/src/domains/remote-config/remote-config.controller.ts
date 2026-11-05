import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from '../projects/projects.service';
import { EnvironmentsService } from '../environments/environments.service';
import { SecretsService } from '../secrets/secrets.service';
import type { JwtPayload } from '@sem/types';

@ApiTags('remote-config')
@Controller('api/v1/remote')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RemoteConfigController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly environmentsService: EnvironmentsService,
    private readonly secretsService: SecretsService,
  ) {}

  @Get(':projectSlug/:environmentSlug')
  @RequireScopes('secrets:read')
  async fetch(
    @CurrentUser() user: JwtPayload,
    @Param('projectSlug') projectSlug: string,
    @Param('environmentSlug') environmentSlug: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    // Resolve project by slug, scoped to org
    const projects = await this.projectsService.findAll(user.org);
    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) {
      return res.status(HttpStatus.NOT_FOUND).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const envs = await this.environmentsService.findAll(project.id, user.org);
    const env = envs.find((e) => e.slug === environmentSlug);
    if (!env) {
      return res.status(HttpStatus.NOT_FOUND).send({ error: { code: 'NOT_FOUND', message: 'Environment not found' } });
    }

    const secretList = await this.secretsService.findAll(env.id, project.id, user.org);
    const payload: Record<string, string> = {};

    for (const s of secretList) {
      payload[s.key] = await this.secretsService.findByKey(
        env.id,
        project.id,
        user.org,
        s.key,
        user.sub,
        req.ip,
      );
    }

    const etag = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    return res
      .status(HttpStatus.OK)
      .header('ETag', etag)
      .header('Cache-Control', 'private, no-store')
      .send({ success: true, data: payload });
  }
}
