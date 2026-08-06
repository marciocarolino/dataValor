import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({ description: 'Access token (JWT)' })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh token (JWT)' })
  refreshToken!: string;
}
