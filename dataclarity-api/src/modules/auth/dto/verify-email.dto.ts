import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificação de e-mail recebido por e-mail',
  })
  @IsString()
  @MinLength(32)
  token!: string;
}
