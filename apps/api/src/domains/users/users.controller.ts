import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { JwtPayload } from '@sem/types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminGuard)
  @Post('admin/users')
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateUserDto) {
    const { user: created, tempPassword } = await this.usersService.create({
      orgId: user.org,
      username: body.username,
      email: body.email,
      role: body.role,
      scopes: body.scopes,
      createdBy: user.sub,
    });

    return {
      success: true,
      data: {
        ...this.usersService.toDto(created),
        temp_password: tempPassword,
        message: 'Store the temp_password and share it with the user. It will not be shown again.',
      },
    };
  }

  @UseGuards(AdminGuard)
  @Get('admin/users')
  async listAll(@CurrentUser() user: JwtPayload) {
    const users = await this.usersService.findAllInOrg(user.org);
    return { success: true, data: users.map((u) => this.usersService.toDto(u)) };
  }

  @UseGuards(AdminGuard)
  @Put('admin/users/:id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(id, user.org, {
      email: body.email,
      role: body.role,
      scopes: body.scopes,
      isActive: body.is_active,
    });
    return { success: true, data: this.usersService.toDto(updated) };
  }

  @UseGuards(AdminGuard)
  @Delete('admin/users/:id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (id === user.sub) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Cannot delete your own account' } };
    }
    await this.usersService.delete(id, user.org);
    return { success: true, data: { message: 'User deleted' } };
  }
}
