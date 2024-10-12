import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SignInDto, SignUpDto } from './dtos/auth.dto';
import { UserType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  private async generateToken(name: string, id: number) {
    const token = jwt.sign({ name: name, id: id }, process.env.JWT_TOKEN, {
      expiresIn: '24h',
    });
    return token;
  }

  async signUp(
    { name, phone, email, password }: SignUpDto,
    userType: UserType,
  ) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prismaService.user.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        type: userType,
      },
    });
    return this.generateToken(user.name, user.id);
  }

  async signIn({ email, password }: SignInDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('User does not exist');
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new HttpException('Invalid password', 400);
    }
    return this.generateToken(user.name, user.id);
  }

  // generates a product key that admin can use and send to anyone who wants to signup as a realtor. With this they can start listing houses
  generateProductKey(email: string, userType: UserType) {
    const string = `${email}-${userType}-${process.env.PRODUCT_KEY}`;
    return bcrypt.hashSync(string, 10);
  }
}
