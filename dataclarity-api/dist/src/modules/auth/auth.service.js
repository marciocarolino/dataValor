"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const env_schema_1 = require("../../config/env.schema");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const EMAIL_VERIFICATION_TTL_MS = 72 * 60 * 60 * 1000;
let AuthService = class AuthService {
    prisma;
    jwt;
    mail;
    env = env_schema_1.envSchema.parse(process.env);
    constructor(prisma, jwt, mail) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.mail = mail;
    }
    async register(input) {
        const normalizedEmail = input.email.toLowerCase().trim();
        const exists = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });
        if (exists) {
            throw new common_1.BadRequestException('E-mail já cadastrado');
        }
        const passwordHash = await bcrypt_1.default.hash(input.password, 12);
        const verificationToken = crypto_1.default.randomBytes(48).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
        const user = await this.prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                name: input.name,
                isActive: false,
                emailVerified: false,
                emailVerificationToken: verificationToken,
                emailVerificationExpiresAt: verificationExpiresAt,
            },
            select: { id: true, email: true, name: true },
        });
        await this.mail.sendEmailVerification(user.email, verificationToken, user.name);
        return {
            message: 'Cadastro realizado! Verifique seu e-mail para ativar sua conta.',
        };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findUnique({
            where: { emailVerificationToken: token },
            select: {
                id: true,
                emailVerified: true,
                emailVerificationExpiresAt: true,
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Token de verificação inválido.');
        }
        if (user.emailVerified) {
            return { message: 'E-mail já verificado. Você pode fazer login.' };
        }
        if (!user.emailVerificationExpiresAt ||
            user.emailVerificationExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Token de verificação expirado. Solicite um novo e-mail de verificação.');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isActive: true,
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpiresAt: null,
            },
        });
        return {
            message: 'E-mail verificado com sucesso! Você já pode fazer login.',
        };
    }
    async login(input) {
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
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const ok = await bcrypt_1.default.compare(input.password, user.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('E-mail não verificado. Verifique sua caixa de entrada e clique no link de ativação.');
        }
        return this.issueTokens(user.id, user.email);
    }
    async refresh(input) {
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
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        const tokenUser = dbToken.user;
        if (!tokenUser.isActive || !tokenUser.emailVerified) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        await this.prisma.refreshToken.update({
            where: { id: dbToken.id },
            data: { revokedAt: new Date() },
        });
        return this.issueTokens(dbToken.userId, tokenUser.email);
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Usuário inválido');
        }
        return { id: user.id, email: user.email, name: user.name };
    }
    async issueTokens(userId, email) {
        if (!this.env.JWT_SECRET) {
            throw new common_1.BadRequestException('JWT_SECRET não configurado');
        }
        if (!this.env.JWT_REFRESH_SECRET) {
            throw new common_1.BadRequestException('JWT_REFRESH_SECRET não configurado');
        }
        if (!this.env.DATABASE_URL) {
            throw new common_1.BadRequestException('DATABASE_URL não configurado');
        }
        const accessPayload = { sub: userId, email };
        const accessToken = await this.jwt.signAsync(accessPayload, {
            secret: this.env.JWT_SECRET,
            expiresIn: this.env.JWT_EXPIRES_IN,
        });
        const refreshToken = await this.jwt.signAsync(accessPayload, {
            secret: this.env.JWT_REFRESH_SECRET,
            expiresIn: this.env.JWT_REFRESH_EXPIRES_IN,
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
    async verifyRefresh(token) {
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: this.env.JWT_REFRESH_SECRET,
            });
            if (!payload?.sub) {
                throw new Error('invalid payload');
            }
            return payload;
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
    }
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    expiresAtFromNow(expiresIn) {
        const match = /^([0-9]+)([smhd])$/.exec(expiresIn.trim());
        if (!match) {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        const value = Number(match[1]);
        const unit = match[2];
        const mult = unit === 's'
            ? 1000
            : unit === 'm'
                ? 60 * 1000
                : unit === 'h'
                    ? 60 * 60 * 1000
                    : 24 * 60 * 60 * 1000;
        return new Date(Date.now() + value * mult);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map