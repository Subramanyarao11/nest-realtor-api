import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { GenerateProductKeyDto, SignInDto, SignUpDto } from './dtos/auth.dto';
import { UserType } from '@prisma/client';
import { User } from '../decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('signup/:userType')
  signup(
    @Body() body: SignUpDto,
    @Param('userType', new ParseEnumPipe(UserType)) userType: UserType,
  ) {
    if (userType !== UserType.BUYER) {
      if (!body.productKey) {
        throw new UnauthorizedException('Product key is required for realtors');
      }

      const validProductKey = `${body.email}-${userType}-${process.env.PRODUCT_KEY}`;

      const isKeyValid = bcrypt.compareSync(validProductKey, body.productKey);
      if (!isKeyValid) {
        throw new UnauthorizedException(
          'Invalid product key, please contact the admin',
        );
      }
    }
    return this.authService.signUp(body, userType);
  }

  @Post('signin')
  sigin(@Body() body: SignInDto) {
    return this.authService.signIn(body);
  }

  @Post('/key')
  generateKey(@Body() { email, userType }: GenerateProductKeyDto) {
    return this.authService.generateProductKey(email, userType);
  }

  @Get('/me')
  getUser(@User() user: User) {
    return user;
  }
}
