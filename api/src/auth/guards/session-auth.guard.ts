import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service.js';
import { SESSION_COOKIE_NAME } from '../auth.constants.js';
import type { AuthUser } from '../auth.types.js';

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookieName =
      process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME;
    const rawToken = req.cookies?.[cookieName] as string | undefined;

    const user = await this.auth.resolveSessionUser(rawToken);
    if (!user) {
      throw new UnauthorizedException('ورود لازم است');
    }

    req.user = user;
    return true;
  }
}
