import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomeResponseDto } from './dtos/home.dto';
import { PropertyType } from '@prisma/client';
import { User } from 'src/user/decorators/user.decorator';

interface GetHomeParams {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  propertyType?: string;
}

interface CreateHomeParams {
  address: string;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}

interface UpdateHomeParams {
  address?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  city?: string;
  price?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getRealorByHomeId(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException('Home not found');
    }

    return home.realtor;
  }

  async getHomes(filters: GetHomeParams) {
    const homes = await this.prismaService.home.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        number_of_bedrooms: true,
        number_of_bathrooms: true,
        property_type: true,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: {
        ...filters,
      },
    });

    if (!homes.length) {
      throw new NotFoundException('No homes found');
    }

    return homes.map((home) => {
      const fetchHome = { ...home, images: home?.images[0]?.url };
      delete fetchHome.images;
      return new HomeResponseDto(fetchHome);
    });
  }

  async getHomeById(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        number_of_bedrooms: true,
        number_of_bathrooms: true,
        property_type: true,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
    });
    if (!home) {
      throw new NotFoundException('Home not found');
    }
    const fetchHome = { ...home, images: home?.images[0]?.url };
    delete fetchHome.images;
    return new HomeResponseDto(fetchHome);
  }

  async createHome(
    {
      address,
      numberOfBedrooms,
      numberOfBathrooms,
      city,
      price,
      landSize,
      propertyType,
      images,
    }: CreateHomeParams,
    userId: number,
  ) {
    const home = await this.prismaService.home.create({
      data: {
        address,
        number_of_bedrooms: numberOfBedrooms,
        number_of_bathrooms: numberOfBathrooms,
        city,
        price,
        land_size: landSize,
        property_type: propertyType,
        realtor_id: userId,
        created_at: new Date(),
      },
    });

    const homeImages = images.map((image) => {
      return { ...image, home_id: home.id };
    });

    await this.prismaService.image.createMany({
      data: homeImages,
    });

    return new HomeResponseDto(home);
  }

  async updateHome(id: number, data: UpdateHomeParams) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
    });

    if (!home) {
      throw new NotFoundException('Home not found');
    }

    const updatedHome = await this.prismaService.home.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return new HomeResponseDto(updatedHome);
  }

  async deleteHome(id: number) {
    await this.prismaService.image.deleteMany({
      where: { home_id: id },
    });

    await this.prismaService.home.delete({
      where: { id },
    });
  }

  async inquire(buyer: User, homeId: number, message: string) {
    const realtor = await this.getRealorByHomeId(homeId);
    return await this.prismaService.message.create({
      data: {
        message,
        home_id: homeId,
        realtor_id: realtor.id,
        buyer_id: buyer.id,
        created_at: new Date(),
      },
    });
  }

  async getMessages(homeId: number) {
    const messages = await this.prismaService.message.findMany({
      where: { home_id: homeId },
      orderBy: { created_at: 'desc' },
    });
    return messages;
  }
}
