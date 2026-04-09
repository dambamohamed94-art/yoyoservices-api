import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  ProductStockStatus,
  StockMovementReason,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';



@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(data: any) {
    const { customer, items, paymentMethod, validationCode } = data;

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0,
    );

    const reference = `YOYO-SERVICES-${Date.now()}`;

    return this.prisma.order.create({
      data: {
        reference,
        status: 'PENDING',

        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        customerPhone: customer.phone,
        customerDistrict: customer.district,

        totalAmount,
        paymentMethod: paymentMethod ?? 'ORANGE_MONEY',
        validationCode: validationCode ?? null,

        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            productNameSnapshot: item.name,
            unitPrice: item.price,
            quantity: item.quantity,
            lineTotal: item.price * item.quantity,
          })),
        },

        payment: {
          create: {
            provider: paymentMethod ?? 'ORANGE_MONEY',
            merchantCode: 'CODE_MARCHAND_ICI',
            validationCode: validationCode ?? null,
            customerPhone: customer.phone,
            amount: totalAmount,
            status: 'SUBMITTED',
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
        payment: true,
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }


  private getStockStatus(quantity: number): ProductStockStatus {
  return quantity <= 0
    ? ProductStockStatus.OUT_OF_STOCK
    : ProductStockStatus.IN_STOCK;
 }

    async updateStatus(id: string, status: string) {
  const nextStatus = status as OrderStatus;

  const order = await this.prisma.order.findUnique({
    where: { id },
    include: {
      payment: true,
      items: true,
    },
  });

  if (!order) {
    throw new NotFoundException('Commande introuvable');
  }

  const stockOutMovements = await this.prisma.stockMovement.findMany({
    where: {
      orderId: order.id,
      type: StockMovementType.OUT,
      reason: StockMovementReason.ORDER_VALIDATED,
    },
  });

  const stockAlreadyDeducted = stockOutMovements.length > 0;

  let paymentStatus = order.payment?.status ?? PaymentStatus.SUBMITTED;

  if (nextStatus === OrderStatus.CONFIRMED || nextStatus === OrderStatus.PAID) {
    paymentStatus = PaymentStatus.VERIFIED;
  }

  if (nextStatus === OrderStatus.CANCELLED) {
    paymentStatus = PaymentStatus.FAILED;
  }

  return this.prisma.$transaction(async (tx) => {
    if (
      (nextStatus === OrderStatus.CONFIRMED || nextStatus === OrderStatus.PAID) &&
      !stockAlreadyDeducted
    ) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produit introuvable pour item ${item.productId}`,
          );
        }

        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${product.name}. Stock actuel: ${product.quantity}, demandé: ${item.quantity}`,
          );
        }

        const newQuantity = product.quantity - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity,
            stockStatus: this.getStockStatus(newQuantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: StockMovementType.OUT,
            reason: StockMovementReason.ORDER_VALIDATED,
            quantity: item.quantity,
            orderId: order.id,
          },
        });
      }
    }

    if (nextStatus === OrderStatus.CANCELLED && stockAlreadyDeducted) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produit introuvable pour item ${item.productId}`,
          );
        }

        const newQuantity = product.quantity + item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity,
            stockStatus: this.getStockStatus(newQuantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: StockMovementType.IN,
            reason: StockMovementReason.MANUAL_ADJUSTMENT,
            quantity: item.quantity,
            orderId: order.id,
          },
        });
      }
    }

    return tx.order.update({
      where: { id },
      data: {
        status: nextStatus,
        payment: order.payment
          ? {
              update: {
                status: paymentStatus,
                paidAt: nextStatus === OrderStatus.PAID ? new Date() : order.payment.paidAt,
              },
            }
          : undefined,
      },
      include: {
        items: true,
        payment: true,
      },
    });
  });
}



}