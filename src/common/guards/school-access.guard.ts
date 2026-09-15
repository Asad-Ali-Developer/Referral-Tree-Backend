import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/jwt-auth.guard';

/**
 * The :schoolId path param is untrusted client input. This guard
 * checks it against the schoolId embedded in the VERIFIED JWT
 * (req.user, set by JwtAuthGuard, which must run first) — that token
 * claim is the only source of truth for tenant membership. A request
 * for a school the caller doesn't belong to is rejected with 403
 * before any query touches the database.
 */
@Injectable()
export class SchoolAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    const requestedSchoolId = req.params.schoolId;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    if (user.schoolId !== requestedSchoolId) {
      throw new ForbiddenException("You do not have access to this school's data");
    }
    return true;
  }
}
