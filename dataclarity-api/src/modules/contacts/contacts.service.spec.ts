import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactStatus } from './enums/contact-status.enum';
import type { CreateContactDto } from './dto/create-contact.dto';
import type { UpdateContactDto } from './dto/update-contact.dto';
import type { ListContactsQueryDto } from './dto/list-contacts-query.dto';

const mockContact = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'João da Silva',
  email: 'joao@email.com',
  phone: '61999999999',
  company: 'Empresa XPTO',
  subject: 'Automação',
  message: 'Preciso automatizar meus relatórios mensais.',
  status: ContactStatus.NEW,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const mockPrismaService = {
  contact: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prisma = module.get<typeof mockPrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  // ─── create ──────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('deve criar um contato com status NEW', async () => {
      const dto: CreateContactDto = {
        name: 'João da Silva',
        email: 'joao@email.com',
        phone: '61999999999',
        company: 'Empresa XPTO',
        subject: 'Automação',
        message: 'Preciso automatizar meus relatórios mensais.',
      };
      prisma.contact.create.mockResolvedValue(mockContact);

      const result = await service.create(dto);

      expect(prisma.contact.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          name: dto.name,
          email: dto.email,
          status: ContactStatus.NEW,
        }),
      });
      expect(result).toEqual(mockContact);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('deve retornar lista paginada de contatos', async () => {
      const query: ListContactsQueryDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      prisma.$transaction.mockResolvedValue([[mockContact], 1]);

      const result = await service.findAll(query);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('deve retornar totalPages=0 quando não há contatos', async () => {
      const query: ListContactsQueryDto = { page: 1, limit: 20 };
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll(query);

      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('deve retornar contato quando ID válido e existente', async () => {
      prisma.contact.findUnique.mockResolvedValue(mockContact);

      const result = await service.findOne(mockContact.id);

      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: mockContact.id },
      });
      expect(result).toEqual(mockContact);
    });

    it('deve lançar NotFoundException quando contato não existe', async () => {
      prisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('550e8400-e29b-41d4-a716-446655440001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('deve atualizar contato existente', async () => {
      const dto: UpdateContactDto = { status: ContactStatus.CONTACTED };
      const updated = { ...mockContact, status: ContactStatus.CONTACTED };

      prisma.contact.findUnique.mockResolvedValue({ id: mockContact.id });
      prisma.contact.update.mockResolvedValue(updated);

      const result = await service.update(mockContact.id, dto);

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: mockContact.id },
        data: { status: ContactStatus.CONTACTED },
      });
      expect(result.status).toBe(ContactStatus.CONTACTED);
    });

    it('deve lançar NotFoundException quando contato não existe', async () => {
      prisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.update('550e8400-e29b-41d4-a716-446655440001', {
          status: ContactStatus.ARCHIVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('deve remover contato existente', async () => {
      prisma.contact.findUnique.mockResolvedValue({ id: mockContact.id });
      prisma.contact.delete.mockResolvedValue(mockContact);

      const result = await service.remove(mockContact.id);

      expect(prisma.contact.delete).toHaveBeenCalledWith({
        where: { id: mockContact.id },
      });
      expect(result).toEqual(mockContact);
    });

    it('deve lançar NotFoundException quando contato não existe', async () => {
      prisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('550e8400-e29b-41d4-a716-446655440001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
