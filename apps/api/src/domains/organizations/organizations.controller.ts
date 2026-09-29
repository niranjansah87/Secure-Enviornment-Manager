import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import type { JwtPayload } from '@sem/types';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('api/v1/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('current')
  async getCurrent(@CurrentUser() user: JwtPayload) {
    const org = await this.orgsService.findById(user.org);
    return { success: true, data: { id: org.id, slug: org.slug, name: org.name, created_at: org.createdAt } };
  }
}
