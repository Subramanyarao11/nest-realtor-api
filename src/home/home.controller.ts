import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { HomeService } from './home.service';
import {
  CreateHomeDto,
  HomeResponseDto,
  InquireHomeDto,
  UpdateHomeDto,
} from './dtos/home.dto';
import { PropertyType, UserType } from '@prisma/client';
import { User } from 'src/user/decorators/user.decorator';
import { Roles } from 'src/decorators/roles.decorators';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHomes(
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('propertyType') propertyType?: PropertyType,
  ): Promise<HomeResponseDto[]> {
    const price =
      minPrice || maxPrice
        ? {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          }
        : undefined;
    const filters = {
      ...(city && { city }),
      ...(price && { price }),
      ...(propertyType && { property_type: propertyType }),
    };

    return this.homeService.getHomes(filters);
  }

  @Get(':id')
  getHomeById(@Param('id', ParseIntPipe) id: number) {
    return this.homeService.getHomeById(id);
  }

  @Roles(UserType.REALTOR)
  @Post()
  createHome(@Body() body: CreateHomeDto, @User() user: User) {
    return this.homeService.createHome(body, user.id);
  }

  @Roles(UserType.REALTOR)
  @Put(':id')
  async updateHome(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHomeDto,
    @User() user: User,
  ) {
    const realtorId = await this.homeService.getRealorByHomeId(id);
    if (realtorId.id !== user.id) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.homeService.updateHome(id, body);
  }

  @Roles(UserType.REALTOR)
  @Delete(':id')
  async deleteHome(@Param('id', ParseIntPipe) id: number, @User() user: User) {
    const realtorId = await this.homeService.getRealorByHomeId(id);
    if (realtorId.id !== user.id) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.homeService.deleteHome(id);
  }

  @Roles(UserType.BUYER)
  @Post('/:id/inquire')
  async inquire(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: User,
    @Body() body: InquireHomeDto,
  ) {
    return this.homeService.inquire(user, homeId, body.message);
  }

  @Roles(UserType.REALTOR)
  @Get('/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: User,
  ) {
    const realtorId = await this.homeService.getRealorByHomeId(homeId);
    if (realtorId.id !== user.id) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.homeService.getMessages(homeId);
  }
}
