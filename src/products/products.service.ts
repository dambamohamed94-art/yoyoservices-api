import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStockStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(categorySlug?: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug && {
          category: {
            slug: categorySlug,
          },
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    });
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const stockStatus =
      dto.quantity <= 4
        ? ProductStockStatus.OUT_OF_STOCK
        : ProductStockStatus.IN_STOCK;

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? '',
          price: dto.price,
          quantity: dto.quantity,
          stockStatus,
          categoryId: dto.categoryId,
          imageUrl: dto.imageUrl ?? '',
          isFeatured: dto.isFeatured ?? false,
          isActive: true,
        },
      });
    } catch (error: any) {
      const message = String(error?.message || '');

      if (message.includes('Product_slug_key')) {
        throw new ConflictException('Un produit avec ce slug existe déjà');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}