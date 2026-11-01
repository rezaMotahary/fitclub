import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../auth.service.js';
import { IS_PUBLIC_KEY, SESSION_COOKIE_NAME } from '../auth.constants.js';
import type { AuthUser } from '../auth.types.js';

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const cookieName =
      process.env.SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME;
    const rawToken = req.cookies?.[cookieName] as string | undefined;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const user = await this.auth.resolveSessionUser(rawToken);
    if (user) {
      req.user = user;
    }

    if (isPublic) {
      return true;
    }

    if (!user) {
      throw new UnauthorizedException('ورود لازم است');
    }

    return true;
  }
}
