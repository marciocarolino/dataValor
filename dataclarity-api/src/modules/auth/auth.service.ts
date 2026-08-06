import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { StringValue } from 'ms';
import { envSchema } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type JwtUserPayload = {
  sub: string;
  email: string;
};

const EMAIL_VERIFICATION_TTL_MS = 72 * 60 * 60 * 1000; // 72 horas

@Injectable()
export class AuthService {
  private env = envSchema.parse(process.env);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const exists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Gera token aleatório de 48 bytes (96 chars hex) com expiração de 72h
    const verificationToken = crypto.randomBytes(48).toString('hex');
    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: input.name,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
      select: { id: true, email: true, name: true },
    });

    // Envia e-mail de verificação (falha silenciosa para não bloquear o cadastro)
    await this.mail.sendEmailVerification(
      user.email,
      verificationToken,
      user.name,
    );

    return {
      message:
        'Cadastro realizado! Verifique seu e-mail para ativar sua conta.',
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: {
        id: true,
        emailVerified: true,
        emailVerificationExpiresAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Token de verificação inválido.');
    }

    if (user.emailVerified) {
      return { message: 'E-mail já verificado. Você pode fazer login.' };
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Token de verificação expirado. Solicite um novo e-mail de verificação.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      message: 'E-mail verificado com sucesso! Você já pode fazer login.',
    };
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
        emailVerified: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'E-mail não verificado. Verifique sua caixa de entrada e clique no link de ativação.',
      );
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(input: {
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.verifyRefresh(input.refreshToken);

    const tokenHash = this.hashToken(input.refreshToken);

    const dbToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { email: true, isActive: true, emailVerified: true } },
      },
    });

    if (!dbToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenUser = dbToken.user as {
      email: string;
      isActive: boolean;
      emailVerified: boolean;
    };

    if (!tokenUser.isActive || !tokenUser.emailVerified) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(dbToken.userId, tokenUser.email);
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
      expiresIn: this.env.JWT_EXPIRES_IN as StringValue,
    });

    const refreshToken = await this.jwt.signAsync(accessPayload, {
      secret: this.env.JWT_REFRESH_SECRET,
      expiresIn: this.env.JWT_REFRESH_EXPIRES_IN as StringValue,
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
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private expiresAtFromNow(expiresIn: string): Date {
    const match = /^([0-9]+)([smhd])$/.exec(expiresIn.trim());
    if (!match) {
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
