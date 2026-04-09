import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (
      !dto?.firstName ||
      !dto?.lastName ||
      !dto?.phone ||
      !dto?.email ||
      !dto?.password
    ) {
      throw new BadRequestException('Tous les champs sont obligatoires');
    }

    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingCustomer) {
      throw new BadRequestException(
        'Un compte existe déjà avec cet email ou ce téléphone',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone,
        email,
        passwordHash,
      },
    });

    return {
      message: 'Compte client créé avec succès',
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
      },
    };
  }

  async login(dto: LoginDto) {
    if (!dto?.email || !dto?.password) {
      throw new BadRequestException('Email et mot de passe obligatoires');
    }

    const email = dto.email.trim().toLowerCase();

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordOk = await bcrypt.compare(dto.password, customer.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = {
      sub: customer.id,
      email: customer.email,
      type: 'customer',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
      },
    };
  }

  async me(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      isActive: customer.isActive,
      emailVerified: customer.emailVerified,
      createdAt: customer.createdAt,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    if (!dto?.email) {
      throw new BadRequestException('Email obligatoire');
    }

    const email = dto.email.trim().toLowerCase();

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    // Message volontairement neutre pour ne pas révéler si l'email existe
    if (!customer) {
      return {
        message:
          'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      };
    }

    const token = randomBytes(32).toString('hex');

    // Lien valable 15 minutes
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await this.prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        token,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Pour le moment : affichage console en dev
    console.log('='.repeat(60));
    console.log('Lien de réinitialisation YOYO SERVICES :');
    console.log(resetLink);
    console.log(`Valable jusqu’au : ${expiresAt.toISOString()}`);
    console.log('='.repeat(60));

    return {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto?.token || !dto?.password) {
      throw new BadRequestException(
        'Le token et le nouveau mot de passe sont obligatoires',
      );
    }

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { customer: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Lien de réinitialisation invalide');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Ce lien a déjà été utilisé');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Le lien de réinitialisation a expiré');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: resetToken.customerId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }
}