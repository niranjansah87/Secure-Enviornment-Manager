import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RateLimitService } from '../../common/services/rate-limit.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, RateLimitService],
  exports: [AuthService, TokenService, RateLimitService],
})
export class AuthModule {}
