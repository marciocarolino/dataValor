import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const exists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: dto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com id "${id}" não encontrado`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.findOne(id);

    const data: {
      name?: string;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
