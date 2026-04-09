import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const categoryCount = await this.prisma.category.count();
    const productCount = await this.prisma.product.count();

    

    return {
      message: 'API YOYO SERVICES OK',
      categoryCount,
      productCount,
    };
  }
}
