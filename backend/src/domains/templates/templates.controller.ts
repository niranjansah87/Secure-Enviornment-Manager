import { Controller, Get, Post, Param, ParseUUIDPipe, Req, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@sem/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { SecretsService } from '../secrets/secrets.service';

const templates = {
  node: { name: 'Node.js service', variables: { NODE_ENV: 'production', PORT: '3000', LOG_LEVEL: 'info', SESSION_SECRET: '__GENERATE__' } },
  nextjs: { name: 'Next.js app', variables: { NEXT_PUBLIC_API_URL: 'https://api.example.com', NEXT_PUBLIC_SITE_URL: 'https://example.com', NEXTAUTH_SECRET: '__GENERATE__', NEXTAUTH_URL: 'https://example.com' } },
  django: { name: 'Django app', variables: { DJANGO_SECRET_KEY: '__GENERATE__', DJANGO_DEBUG: 'false', DJANGO_ALLOWED_HOSTS: 'example.com', DATABASE_URL: 'postgres://user:pass@host:5432/db' } },
  postgres: { name: 'PostgreSQL', variables: { DATABASE_URL: 'postgres://user:pass@host:5432/db', PGHOST: 'localhost', PGPORT: '5432', PGUSER: 'postgres', PGPASSWORD: '__GENERATE__', PGDATABASE: 'app' } },
  redis: { name: 'Redis', variables: { REDIS_URL: 'redis://localhost:6379', REDIS_TLS: 'false' } },
  stripe: { name: 'Stripe', variables: { STRIPE_SECRET_KEY: '', STRIPE_PUBLISHABLE_KEY: '', STRIPE_WEBHOOK_SECRET: '' } },
  aws: { name: 'AWS', variables: { AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', AWS_REGION: 'us-east-1', AWS_S3_BUCKET: 'my-bucket' } },
  smtp: { name: 'SMTP email', variables: { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587', SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM: 'noreply@example.com' } },
} as const;

@Controller('api/v1')
export class TemplatesController {
  constructor(private readonly secrets: SecretsService) {}

  @Get('templates')
  @RequireScopes('secrets:read')
  list() {
    return { success: true, data: templates };
  }

  @Post('projects/:projectId/environments/:environmentId/templates/:templateId/apply')
  @RequireScopes('secrets:write')
  async apply(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Param('templateId') templateId: keyof typeof templates,
    @Req() req: FastifyRequest,
  ) {
    const template = templates[templateId];
    if (!template) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Template not found' });
    const values = Object.entries(template.variables).map(([key, value]) => ({
      key,
      value: value === '__GENERATE__' ? randomBytes(32).toString('base64url') : value,
      is_sensitive: /SECRET|PASSWORD|KEY|TOKEN|DATABASE_URL|REDIS_URL/.test(key),
    }));
    await this.secrets.bulkReplace(environmentId, projectId, user.org, values, user.sub, req.ip);
    return { success: true, data: { template: template.name, keys_added: values.length } };
  }
}
