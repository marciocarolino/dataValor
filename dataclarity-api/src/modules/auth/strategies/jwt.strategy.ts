import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envSchema } from '../../../config/env.schema';

export type JwtAccessPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private env = envSchema.parse(process.env);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // em desenvolvimento/test, garante que o app suba mesmo sem env carregado,
      // mas o validate falhará se o token não estiver assinado corretamente.
      secretOrKey: envSchema.parse(process.env).JWT_SECRET ?? 'dev',
    });
  }

  validate(payload: JwtAccessPayload): JwtAccessPayload {
    return payload;
  }
}
