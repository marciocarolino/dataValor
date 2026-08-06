import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUserEntity } from './entities/auth-user.entity';

@ApiTags('Authentication')
@Controller('/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/register')
  @ApiOkResponse({ type: AuthTokensDto })
  async register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.auth.register(dto);
  }

  @Post('/login')
  @ApiOkResponse({ type: AuthTokensDto })
  async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto);
  }

  @Post('/refresh')
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
