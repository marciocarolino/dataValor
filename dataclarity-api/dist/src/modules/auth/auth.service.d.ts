import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly mail;
    private env;
    constructor(prisma: PrismaService, jwt: JwtService, mail: MailService);
    register(input: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    login(input: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(input: {
        refreshToken: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        name?: string | null;
    }>;
    private issueTokens;
    private verifyRefresh;
    private hashToken;
    private expiresAtFromNow;
}
