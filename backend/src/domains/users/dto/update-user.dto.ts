import { IsString, IsOptional, IsEmail, IsIn, IsArray, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['admin', 'developer', 'viewer'])
  role?: 'admin' | 'developer' | 'viewer';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
