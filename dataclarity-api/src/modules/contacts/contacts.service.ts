import { Injectable, NotFoundException } from '@nestjs/common';
import type { Contact, Prisma } from '../../../generated/prisma/index';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactStatus } from './enums/contact-status.enum';
import type { CreateContactDto } from './dto/create-contact.dto';
import type { UpdateContactDto } from './dto/update-contact.dto';
import type { ListContactsQueryDto } from './dto/list-contacts-query.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    const data: Prisma.ContactCreateInput = {
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      company: dto.company ?? null,
      subject: dto.subject ?? null,
      message: dto.message,
      status: ContactStatus.NEW,
    };

    return this.prisma.contact.create({ data });
  }

  async findAll(
    query: ListContactsQueryDto,
  ): Promise<PaginatedResult<Contact>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ContactWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { company: { contains: query.search, mode: 'insensitive' } },
              { subject: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ContactOrderByWithRelationInput = {
      createdAt: query.sortOrder ?? 'desc',
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contato não encontrado.');
    return contact;
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const exists = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Contato não encontrado.');

    const data: Prisma.ContactUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.contact.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Contact> {
    const exists = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Contato não encontrado.');

    return this.prisma.contact.delete({ where: { id } });
  }

  /** @deprecated Use update() with status field instead */
  async updateStatus(id: string, status: ContactStatus): Promise<Contact> {
    return this.update(id, { status });
  }
}
