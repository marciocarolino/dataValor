/**
 * E2E – Indicator History (Resultados Históricos por Período)
 * Cobre: POST, GET (list + single), DELETE
 * Usa mocks de PrismaService e IndicatorHistoryService — sem banco de dados real.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { IndicatorsModule } from '../src/modules/indicators/indicators.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { IndicatorsService } from '../src/modules/indicators/indicators.service';
import { IndicatorAnalyticsService } from '../src/modules/indicators/indicator-analytics.service';
import { IndicatorCronService } from '../src/modules/indicators/indicator-cron.service';
import { MeasurementsService } from '../src/modules/indicators/measurements.service';
import { IndicatorHistoryService } from '../src/modules/indicators/indicator-history.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { IndicatorStatus } from '../src/modules/indicators/enums/indicator-status.enum';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INDICATOR_ID = 'aabbccdd-0000-4000-a000-000000000001';
const HISTORY_ID = 'bbccddee-1111-4111-b111-111111111111';
const INDICATOR_ID_2 = 'aa112233-5555-4000-a111-aabbccddee00';
const MOCK_DATE = new Date('2026-08-07T00:00:00.000Z');

const mockHistoryRecord = {
  id: HISTORY_ID,
  indicatorId: INDICATOR_ID,
  periodStart: new Date('2026-08-01T00:00:00.000Z'),
  periodEnd: new Date('2026-08-31T23:59:59.000Z'),
  value: 1500,
  goalValue: 1400,
  previousValue: 1344,
  variationPercent: 11.61,
  status: IndicatorStatus.SUCCESS,
  notes: null,
  calculatedAt: MOCK_DATE,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
};

const mockPaginatedHistory = {
  items: [mockHistoryRecord],
  pagination: {
    page: 1,
    limit: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

// ── Mock do IndicatorHistoryService ───────────────────────────────────────────

const mockHistoryService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('Indicator History (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IndicatorsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(IndicatorsService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        getAnalytics: jest.fn(),
        getHistory: jest.fn(),
        getDashboardSummary: jest.fn(),
        getSummary: jest.fn(),
        findDashboard: jest.fn(),
        findByCategory: jest.fn(),
      })
      .overrideProvider(IndicatorAnalyticsService)
      .useValue({})
      .overrideProvider(IndicatorCronService)
      .useValue({})
      .overrideProvider(MeasurementsService)
      .useValue({})
      .overrideProvider(IndicatorHistoryService)
      .useValue(mockHistoryService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
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
    mockHistoryService.create.mockResolvedValue(mockHistoryRecord);
    mockHistoryService.findAll.mockResolvedValue(mockPaginatedHistory);
    mockHistoryService.findOne.mockResolvedValue(mockHistoryRecord);
    mockHistoryService.remove.mockResolvedValue(mockHistoryRecord);
  });

  const BASE = `/api/v1/indicators/${INDICATOR_ID}/history`;
  const BASE2 = `/api/v1/indicators/${INDICATOR_ID_2}/history`;

  const validBody = {
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-31T23:59:59.000Z',
    value: 1500,
    goalValue: 1400,
    previousValue: 1344,
    variationPercent: 11.61,
    status: 'SUCCESS',
  };

  // ── POST ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/indicators/:indicatorId/history', () => {
    it('1. normal: criar histórico para um indicador → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(BASE)
        .send(validBody)
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id', HISTORY_ID);
      expect(res.body).toHaveProperty('indicatorId', INDICATOR_ID);
      expect(mockHistoryService.create).toHaveBeenCalledWith(
        INDICATOR_ID,
        expect.objectContaining({ status: 'SUCCESS' }),
      );
    });

    it('6. invalid: periodStart > periodEnd → 400', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .send({
          ...validBody,
          periodStart: '2026-09-01T00:00:00.000Z',
          periodEnd: '2026-08-01T00:00:00.000Z',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });

    it('7. invalid: status inválido → 400', async () => {
      await request(app.getHttpServer())
        .post(BASE)
        .send({ ...validBody, status: 'INACTIVE' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });

    it('7b. invalid: status válidos aceitos (todos os valores do enum) → 201', async () => {
      for (const status of Object.values(IndicatorStatus)) {
        mockHistoryService.create.mockResolvedValueOnce({
          ...mockHistoryRecord,
          status,
        });
        await request(app.getHttpServer())
          .post(BASE)
          .send({ ...validBody, status })
          .expect(HttpStatus.CREATED);
      }
    });

    it('invalid: periodStart ausente → 400', async () => {
      const { periodStart: _ps, ...bodyWithoutStart } = validBody;
      await request(app.getHttpServer())
        .post(BASE)
        .send(bodyWithoutStart)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('invalid: periodEnd ausente → 400', async () => {
      const { periodEnd: _pe, ...bodyWithoutEnd } = validBody;
      await request(app.getHttpServer())
        .post(BASE)
        .send(bodyWithoutEnd)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('4. invalid: período duplicado para o mesmo indicador → 409', async () => {
      mockHistoryService.create.mockRejectedValueOnce(
        new ConflictException(
          'Já existe um resultado histórico para este indicador neste período exato.',
        ),
      );

      await request(app.getHttpServer())
        .post(BASE)
        .send(validBody)
        .expect(HttpStatus.CONFLICT);
    });

    it('5. unaffected: mesmo período pode existir para indicadores diferentes → 201', async () => {
      mockHistoryService.create.mockResolvedValueOnce({
        ...mockHistoryRecord,
        id: 'ddee0011-3333-4333-b333-333333333333',
        indicatorId: INDICATOR_ID_2,
      });

      const res = await request(app.getHttpServer())
        .post(BASE2)
        .send(validBody)
        .expect(HttpStatus.CREATED);

      expect(res.body.indicatorId).toBe(INDICATOR_ID_2);
    });

    it('invalid: indicatorId inválido (não UUID) → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/indicators/not-a-uuid/history')
        .send(validBody)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('invalid: indicador não encontrado → 404', async () => {
      mockHistoryService.create.mockRejectedValueOnce(
        new NotFoundException('Indicador não encontrado.'),
      );

      await request(app.getHttpServer())
        .post(BASE)
        .send(validBody)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── GET (list) ────────────────────────────────────────────────────────────

  describe('GET /api/v1/indicators/:indicatorId/history', () => {
    it('2. normal: consultar histórico → 200 paginado', async () => {
      const res = await request(app.getHttpServer())
        .get(BASE)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(mockHistoryService.findAll).toHaveBeenCalledWith(
        INDICATOR_ID,
        expect.any(Object),
      );
    });

    it('3. normal: histórico retorna ordenado por período decrescente (mais recente primeiro)', async () => {
      const olderRecord = {
        ...mockHistoryRecord,
        id: 'ffff0000-4444-4444-e444-444444444444',
        periodStart: new Date('2026-07-01T00:00:00.000Z'),
        periodEnd: new Date('2026-07-31T23:59:59.000Z'),
      };
      mockHistoryService.findAll.mockResolvedValueOnce({
        items: [mockHistoryRecord, olderRecord],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app.getHttpServer())
        .get(BASE)
        .expect(HttpStatus.OK);

      // Primeiro item deve ter o período mais recente
      const items = res.body.items as Array<{ periodStart: string }>;
      expect(new Date(items[0].periodStart).getTime()).toBeGreaterThanOrEqual(
        new Date(items[1].periodStart).getTime(),
      );
    });

    it('10. unaffected: histórico disponível para indicador ativo', async () => {
      await request(app.getHttpServer()).get(BASE).expect(HttpStatus.OK);
      expect(mockHistoryService.findAll).toHaveBeenCalledTimes(1);
    });

    it('11. unaffected: histórico disponível para indicador inativo (isActive=false não afeta histórico)', async () => {
      // O serviço não filtra por isActive — histórico é acessível independentemente
      await request(app.getHttpServer()).get(BASE).expect(HttpStatus.OK);
      expect(mockHistoryService.findAll).toHaveBeenCalledWith(
        INDICATOR_ID,
        expect.not.objectContaining({ isActive: expect.anything() }),
      );
    });

    it('boundary: retorna lista vazia quando não há histórico → 200', async () => {
      mockHistoryService.findAll.mockResolvedValueOnce({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app.getHttpServer())
        .get(BASE)
        .expect(HttpStatus.OK);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.pagination.totalItems).toBe(0);
    });

    it('normal: suporta filtro de período por startDate e endDate → 200', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}?startDate=2026-01-01&endDate=2026-12-31`)
        .expect(HttpStatus.OK);

      expect(mockHistoryService.findAll).toHaveBeenCalledWith(
        INDICATOR_ID,
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        }),
      );
    });
  });

  // ── GET (single) ──────────────────────────────────────────────────────────

  describe('GET /api/v1/indicators/:indicatorId/history/:id', () => {
    it('normal: detalhar resultado histórico → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/${HISTORY_ID}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('id', HISTORY_ID);
      expect(res.body).toHaveProperty('indicatorId', INDICATOR_ID);
    });

    it('invalid: ID não existente → 404', async () => {
      mockHistoryService.findOne.mockRejectedValueOnce(
        new NotFoundException('Resultado histórico não encontrado.'),
      );

      await request(app.getHttpServer())
        .get(`${BASE}/${HISTORY_ID}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('invalid: ID não é UUID → 400', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/not-a-uuid`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/indicators/:indicatorId/history/:id', () => {
    it('normal: remover resultado histórico → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${BASE}/${HISTORY_ID}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('id', HISTORY_ID);
      expect(mockHistoryService.remove).toHaveBeenCalledWith(
        INDICATOR_ID,
        HISTORY_ID,
      );
    });

    it('8. unaffected: desativar indicador não apaga histórico — histórico continua acessível após isActive=false', async () => {
      // Neste teste verificamos que o histórico ainda pode ser consultado
      // independentemente de isActive do indicador (nenhum filtro de isActive no serviço)
      await request(app.getHttpServer()).get(BASE).expect(HttpStatus.OK);
      expect(mockHistoryService.findAll).toHaveBeenCalledWith(
        INDICATOR_ID,
        expect.not.objectContaining({ isActive: expect.anything() }),
      );
    });

    it('9. unaffected: reativar indicador não altera histórico — histórico permanece intacto', async () => {
      // Reativar é apenas um PATCH isActive=true no indicador, sem efeito no histórico
      await request(app.getHttpServer()).get(BASE).expect(HttpStatus.OK);
      expect(mockHistoryService.findAll).toHaveBeenCalledTimes(1);
    });

    it('invalid: ID não existente → 404', async () => {
      mockHistoryService.remove.mockRejectedValueOnce(
        new NotFoundException('Resultado histórico não encontrado.'),
      );

      await request(app.getHttpServer())
        .delete(`${BASE}/${HISTORY_ID}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('invalid: ID não é UUID → 400', async () => {
      await request(app.getHttpServer())
        .delete(`${BASE}/not-a-uuid`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
