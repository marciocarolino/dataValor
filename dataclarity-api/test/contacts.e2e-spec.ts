import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ContactsModule } from '../src/modules/contacts/contacts.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContactsService } from '../src/modules/contacts/contacts.service';
import { ContactStatus } from '../src/modules/contacts/enums/contact-status.enum';
import type { PaginatedResult } from '../src/modules/contacts/contacts.service';

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
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const validPayload = {
  name: 'João da Silva',
  email: 'joao@email.com',
  phone: '61999999999',
  company: 'Empresa XPTO',
  subject: 'Automação de relatórios',
  message: 'Preciso automatizar meus relatórios mensais de forma eficiente.',
};

const mockContact = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ...validPayload,
  status: ContactStatus.NEW,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const mockContactsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('Contacts (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ContactsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(ContactsService)
      .useValue(mockContactsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/contacts ────────────────────────────────────────────────
  describe('POST /api/v1/contacts', () => {
    it('deve criar contato com payload válido (201)', async () => {
      mockContactsService.create.mockResolvedValue(mockContact);

      const res = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send(validPayload)
        .expect(HttpStatus.CREATED);

      expect(res.body).toMatchObject({ id: mockContact.id });
      expect(mockContactsService.create).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 para payload inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'A', email: 'invalid', message: 'short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockContactsService.create).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando message está ausente', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ name: 'João', email: 'joao@email.com' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ─── GET /api/v1/contacts ─────────────────────────────────────────────────
  describe('GET /api/v1/contacts', () => {
    it('deve listar contatos paginados (200)', async () => {
      const paginated: PaginatedResult<typeof mockContact> = {
        items: [mockContact],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockContactsService.findAll.mockResolvedValue(paginated);

      const res = await request(app.getHttpServer())
        .get('/api/v1/contacts')
        .expect(HttpStatus.OK);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(res.body).toMatchObject({ items: expect.any(Array) });
      expect(mockContactsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ─── GET /api/v1/contacts/:id ─────────────────────────────────────────────
  describe('GET /api/v1/contacts/:id', () => {
    it('deve retornar contato pelo ID (200)', async () => {
      mockContactsService.findOne.mockResolvedValue(mockContact);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/contacts/${mockContact.id}`)
        .expect(HttpStatus.OK);

      expect(res.body).toMatchObject({ id: mockContact.id });
    });

    it('deve retornar 400 para UUID inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/contacts/not-a-valid-uuid')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockContactsService.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── PATCH /api/v1/contacts/:id ───────────────────────────────────────────
  describe('PATCH /api/v1/contacts/:id', () => {
    it('deve atualizar contato (200)', async () => {
      const updated = { ...mockContact, status: ContactStatus.CONTACTED };
      mockContactsService.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/contacts/${mockContact.id}`)
        .send({ status: ContactStatus.CONTACTED })
        .expect(HttpStatus.OK);

      expect(res.body).toMatchObject({ status: ContactStatus.CONTACTED });
      expect(mockContactsService.update).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 para UUID inválido', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/contacts/invalid-uuid')
        .send({ status: ContactStatus.CONTACTED })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ─── DELETE /api/v1/contacts/:id ──────────────────────────────────────────
  describe('DELETE /api/v1/contacts/:id', () => {
    it('deve excluir contato (200)', async () => {
      mockContactsService.remove.mockResolvedValue(mockContact);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/contacts/${mockContact.id}`)
        .expect(HttpStatus.OK);

      expect(res.body).toMatchObject({ id: mockContact.id });
      expect(mockContactsService.remove).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 para UUID inválido', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/contacts/invalid-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
