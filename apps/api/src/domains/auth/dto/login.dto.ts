import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  api_key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  master_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  device_name?: string;
}
