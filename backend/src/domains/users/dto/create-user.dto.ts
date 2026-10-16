import { IsString, IsOptional, IsEmail, IsIn, IsArray, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  username!: string;

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
}
