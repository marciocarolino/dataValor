import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { envSchema } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';

type JwtUserPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  private env = envSchema.parse(process.env);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const exists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: input.name,
      },
      select: { id: true, email: true },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(input: {
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    // Valida assinatura/exp do refresh JWT
    const payload = await this.verifyRefresh(input.refreshToken);

    const tokenHash = this.hashToken(input.refreshToken);

    const dbToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { email: true, isActive: true } },
      },
    });

    if (!dbToken?.user?.isActive) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rotação: revoga o token atual e emite novo par
    await this.prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(dbToken.userId, dbToken.user.email);
  }

  async me(
    userId: string,
  ): Promise<{ id: string; email: string; name?: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inválido');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.env.JWT_SECRET) {
      throw new BadRequestException('JWT_SECRET não configurado');
    }
    if (!this.env.JWT_REFRESH_SECRET) {
      throw new BadRequestException('JWT_REFRESH_SECRET não configurado');
    }
    if (!this.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL não configurado');
    }

    const accessPayload: JwtUserPayload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.env.JWT_SECRET,
      expiresIn: this.env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = await this.jwt.signAsync(accessPayload, {
      secret: this.env.JWT_REFRESH_SECRET,
      expiresIn: this.env.JWT_REFRESH_EXPIRES_IN as any,
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.expiresAtFromNow(this.env.JWT_REFRESH_EXPIRES_IN);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        expiresAt,
        user: { connect: { id: userId } },
      },
      select: { id: true },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefresh(token: string): Promise<JwtUserPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtUserPayload>(token, {
        secret: this.env.JWT_REFRESH_SECRET,
      });

      if (!payload?.sub) {
        throw new Error('invalid payload');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private hashToken(token: string): string {
    // Hash determinístico para lookup no banco, sem armazenar token em texto puro
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private expiresAtFromNow(expiresIn: string): Date {
    // suporta padrões simples tipo '7d', '15m', '1h'
    const match = /^([0-9]+)([smhd])$/.exec(expiresIn.trim());
    if (!match) {
      // fallback: 7 dias
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unit = match[2];

    const mult =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60 * 1000
          : unit === 'h'
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

    return new Date(Date.now() + value * mult);
  }
}
