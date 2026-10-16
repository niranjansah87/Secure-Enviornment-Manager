import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  current_password!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(1000)
  new_password!: string;
}
