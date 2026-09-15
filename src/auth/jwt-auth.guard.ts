import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokensService } from './tokens.service';

export interface AuthenticatedUser {
  id: string;
  schoolId: string;
}

/**
 * Verifies the bearer token as an ACCESS token specifically (wrong
 * secret or wrong `type` claim both fail) and attaches
 * { id, schoolId } to the request. This is the only place schoolId
 * is trusted from — never from route params or the request body.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'];

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.tokens.verifyAccessToken(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Wrong token type');
      }
      req.user = { id: payload.sub, schoolId: payload.schoolId } as AuthenticatedUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
