import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from 'src/prisma/prisma.service';

interface JWTPayload {
  id: number;
  name: string;
  exp: number;
  iat: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserType[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length) {
      const req = ctx.switchToHttp().getRequest();
      const token = req?.headers['authorization']?.split('Bearer ')[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_TOKEN) as JWTPayload;
        const user = await this.prismaService.user.findUnique({
          where: { id: payload.id },
        });
        if (!user) {
          return false;
        }
        if (!roles.includes(user.type)) {
          return false;
        }
        return true;
      } catch (error) {
        return false;
      }
    }
    return true;
  }
}
