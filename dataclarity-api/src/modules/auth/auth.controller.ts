import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUserEntity } from './entities/auth-user.entity';

@ApiTags('Authentication')
@Controller('/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/register')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: RegisterResponseDto })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.auth.register(dto);
  }

  @Get('/verify-email')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: RegisterResponseDto })
  @ApiQuery({
    name: 'token',
    description: 'Token de verificação de e-mail',
    required: true,
  })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    return this.auth.verifyEmail(token);
  }

  @Post('/login')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: AuthTokensDto })
  async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto);
  }

  @Post('/refresh')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: AuthTokensDto })
  async refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AuthUserEntity })
  async me(@Req() req: Request): Promise<AuthUserEntity> {
    const user = req.user as { sub: string } | undefined;
    return this.auth.me(user?.sub ?? '');
  }
}
