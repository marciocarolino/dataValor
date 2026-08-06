import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUserEntity } from './entities/auth-user.entity';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<AuthTokensDto>;
    login(dto: LoginDto): Promise<AuthTokensDto>;
    refresh(dto: RefreshDto): Promise<AuthTokensDto>;
    me(req: Request): Promise<AuthUserEntity>;
}
