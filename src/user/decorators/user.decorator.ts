import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface User {
  name: string;
  id: number;
  iat: number;
  exp: number;
}

export const User = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
