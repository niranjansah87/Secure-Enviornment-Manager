import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipPasswordCheck } from '../../common/decorators/skip-password-check.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from '@sem/types';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AuditService } from '../audit/audit.service';

@ApiTags('auth')
@Controller('api/v1/auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Req() req: FastifyRequest) {
    const result = await this.authService.login({
      organization: body.organization,
      username: body.username,
      password: body.password,
      apiKey: body.api_key,
      masterToken: body.master_token,
      deviceName: body.device_name,
      deviceIp: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: 'bearer',
        expires_in: 900,
        must_change_password: result.mustChangePassword,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto, @Req() req: FastifyRequest) {
    const tokens = await this.tokenService.rotateRefreshToken(body.refresh_token, req.ip);
    if (!tokens) {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Invalid or expired refresh token' });
    }
    return {
      success: true,
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: 'bearer',
        expires_in: 900,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload, @Req() req: FastifyRequest) {
    await this.tokenService.revokeSession(user.session_id, 'logout');
    await this.audit.writeEvent({ orgId: user.org, actorId: user.sub, actorType: 'user', action: 'auth.logout', resourceType: 'session', resourceId: user.session_id, metadata: {}, ip: req.ip });
    return { success: true, data: { message: 'Logged out successfully' } };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: JwtPayload, @Req() req: FastifyRequest) {
    await this.tokenService.revokeAllUserSessions(user.sub, 'logout_all');
    await this.audit.writeEvent({ orgId: user.org, actorId: user.sub, actorType: 'user', action: 'auth.logout_all', resourceType: 'user', resourceId: user.sub, metadata: {}, ip: req.ip });
    return { success: true, data: { message: 'All sessions revoked' } };
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return {
      success: true,
      data: {
        id: user.sub,
        org_id: user.org,
        role: user.role,
        scopes: user.scopes,
        session_id: user.session_id,
        auth_method: user.auth_method,
      },
    };
  }

  @Get('sessions')
  async sessions(@CurrentUser() user: JwtPayload) {
    const sessions = await this.tokenService.getActiveSessions(user.sub);
    return {
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        device_name: s.deviceName,
        device_ip: s.deviceIp,
        user_agent: s.userAgent,
        last_active_at: s.lastActiveAt,
        created_at: s.createdAt,
        expires_at: s.expiresAt,
        is_current: s.id === user.session_id,
      })),
    };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) sessionId: string, @Req() req: FastifyRequest) {
    // Users can only revoke their own sessions
    const sessions = await this.tokenService.getActiveSessions(user.sub);
    const owned = sessions.find((s) => s.id === sessionId);
    if (!owned) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Session not found' });
    }
    await this.tokenService.revokeSession(sessionId, 'user_revoked');
    await this.audit.writeEvent({ orgId: user.org, actorId: user.sub, actorType: 'user', action: 'session.revoke', resourceType: 'session', resourceId: sessionId, metadata: {}, ip: req.ip });
    return { success: true, data: { message: 'Session revoked' } };
  }

  @Get('devices')
  async devices(@CurrentUser() user: JwtPayload) {
    return this.sessions(user);
  }

  @Get('devices/:id')
  async device(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const session = (await this.tokenService.getActiveSessions(user.sub)).find((item) => item.id === id);
    if (!session) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Device not found' });
    return { success: true, data: session };
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  async revokeDevice(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    return this.revokeSession(user, id, req);
  }

  @UseGuards(AdminGuard)
  @Get('admin/sessions')
  async adminSessions(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.tokenService.getActiveSessionsForOrg(user.org) };
  }

  @UseGuards(AdminGuard)
  @Get('admin/devices')
  async adminDevices(@CurrentUser() user: JwtPayload) {
    return this.adminSessions(user);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/sessions/:id')
  @HttpCode(HttpStatus.OK)
  async adminRevokeSession(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    if (!(await this.tokenService.revokeOrgSession(id, user.org, 'admin_revoked'))) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Session not found' });
    }
    await this.audit.writeEvent({ orgId: user.org, actorId: user.sub, actorType: 'user', action: 'session.admin_revoke', resourceType: 'session', resourceId: id, metadata: {}, ip: req.ip });
    return { success: true, data: { message: 'Session revoked' } };
  }

  @UseGuards(AdminGuard)
  @Delete('admin/devices/:id')
  @HttpCode(HttpStatus.OK)
  async adminRevokeDevice(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    return this.adminRevokeSession(user, id, req);
  }

  @SkipPasswordCheck()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() body: ChangePasswordDto) {
    await this.authService.changePassword(user.sub, body.current_password, body.new_password);
    // Revoke all other sessions after password change for security
    await this.tokenService.revokeOtherUserSessions(user.sub, user.session_id, 'password_changed');
    return { success: true, data: { message: 'Password changed. All other sessions have been revoked.' } };
  }

  @Get('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@CurrentUser() user: JwtPayload) {
    return { success: true, data: { valid: true, sub: user.sub, org: user.org } };
  }
}
