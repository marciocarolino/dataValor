/**
 * E2E – Indicators CRUD
 * Cobre: POST, GET (list + single + analytics), PATCH, DELETE
 * Usa mocks de PrismaService e IndicatorsService — sem banco de dados real.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { IndicatorsModule } from '../src/modules/indicators/indicators.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { IndicatorsService } from '../src/modules/indicators/indicators.service';
import { IndicatorAnalyticsService } from '../src/modules/indicators/indicator-analytics.service';
import { IndicatorCronService } from '../src/modules/indicators/indicator-cron.service';
import { MeasurementsService } from '../src/modules/indicators/measurements.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { IndicatorStatus } from '../src/modules/indicators/enums/indicator-status.enum';
import { IndicatorCategory } from '../src/modules/indicators/enums/indicator-category.enum';
import { IndicatorChartType } from '../src/modules/indicators/enums/indicator-chart-type.enum';
import { IndicatorDesiredDirection } from '../src/modules/indicators/enums/indicator-desired-direction.enum';
import { IndicatorTargetStatus } from '../src/modules/indicators/enums/indicator-target-status.enum';
import { IndicatorVariationStatus } from '../src/modules/indicators/enums/indicator-variation-status.enum';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ID = 'aabbccdd-0000-4000-a000-000000000001';
const MOCK_DATE = new Date('2026-08-07T00:00:00.000Z');

const mockIndicator = {
  id: MOCK_ID,
  name: 'Receita Total',
  description: 'Receita bruta do mês',
  category: IndicatorCategory.FINANCIAL,
  formula: null,
  unit: 'BRL',
  goalValue: 2000,
  minimumGoalValue: null,
  maximumGoalValue: null,
  desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
  currentValue: 1500,
  previousValue: 1000,
  previousPeriod: null,
  variation: 50,
  status: IndicatorStatus.SUCCESS,
  color: null,
  icon: null,
  chartType: IndicatorChartType.BAR,
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-08-31T00:00:00.000Z',
  daysRemaining: 23,
  isActive: true,
  showOnDashboard: false,
  createdAt: MOCK_DATE.toISOString(),
  updatedAt: MOCK_DATE.toISOString(),
  analytics: {
    currentValue: 1500,
    previousValue: 1000,
    variation: 50,
    variationCalculationStatus: IndicatorVariationStatus.CALCULATED,
    targetAchievementPercentage: 75,
    targetDifference: -500,
    targetStatus: IndicatorTargetStatus.ON_TRACK,
    daysRemaining: 23,
    isOverdue: false,
    lastMeasurementDate: '2026-08-07',
  },
};

const mockPaginated = {
  items: [mockIndicator],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockAnalyticsResult = {
  currentValue: 1500,
  previousValue: 1000,
  variation: 50,
  variationCalculationStatus: IndicatorVariationStatus.CALCULATED,
  targetAchievementPercentage: 75,
  targetDifference: -500,
  targetStatus: IndicatorTargetStatus.ON_TRACK,
  daysRemaining: 23,
  isOverdue: false,
  lastMeasurementDate: '2026-08-07',
  computedStatus: IndicatorStatus.SUCCESS,
};

const mockSummary = {
  total: 1,
  active: 1,
  inactive: 0,
  categories: 1,
  byStatus: {
    [IndicatorStatus.SUCCESS]: 1,
    [IndicatorStatus.WARNING]: 0,
    [IndicatorStatus.DANGER]: 0,
    [IndicatorStatus.NEUTRAL]: 0,
  },
};

// ── Mock do IndicatorsService ──────────────────────────────────────────────────

const mockIndicatorsService = {
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
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('Indicators (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IndicatorsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(IndicatorsService)
      .useValue(mockIndicatorsService)
      .overrideProvider(IndicatorAnalyticsService)
      .useValue({})
      .overrideProvider(IndicatorCronService)
      .useValue({})
      .overrideProvider(MeasurementsService)
      .useValue({})
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
    mockIndicatorsService.create.mockResolvedValue(mockIndicator);
    mockIndicatorsService.findAll.mockResolvedValue(mockPaginated);
    mockIndicatorsService.findOne.mockResolvedValue(mockIndicator);
    mockIndicatorsService.update.mockResolvedValue({
      ...mockIndicator,
      name: 'Receita Total Atualizada',
    });
    mockIndicatorsService.remove.mockResolvedValue(mockIndicator);
    mockIndicatorsService.getAnalytics.mockResolvedValue(mockAnalyticsResult);
    mockIndicatorsService.getDashboardSummary.mockResolvedValue(mockSummary);
    mockIndicatorsService.getSummary.mockResolvedValue(mockSummary);
    mockIndicatorsService.findDashboard.mockResolvedValue([mockIndicator]);
    mockIndicatorsService.findByCategory.mockResolvedValue([mockIndicator]);
    mockIndicatorsService.getHistory.mockResolvedValue([]);
  });

  // ── POST /api/v1/indicators ────────────────────────────────────────────────

  describe('POST /api/v1/indicators', () => {
    const validBody = {
      name: 'Receita Total',
      category: 'FINANCIAL',
      chartType: 'BAR',
      unit: 'BRL',
      goalValue: 2000,
      desiredDirection: 'HIGHER_IS_BETTER',
      endDate: '2026-08-31T00:00:00.000Z',
    };

    it('normal: deve criar indicador com campos válidos → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send(validBody)
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id', MOCK_ID);
      expect(res.body.name).toBe('Receita Total');
      expect(mockIndicatorsService.create).toHaveBeenCalledTimes(1);
    });

    it('normal: deve aceitar todos os valores do enum IndicatorStatus', async () => {
      for (const status of Object.values(IndicatorStatus)) {
        mockIndicatorsService.create.mockResolvedValueOnce({
          ...mockIndicator,
          status,
        });
        await request(app.getHttpServer())
          .post('/api/v1/indicators')
          .send({ ...validBody, status })
          .expect(HttpStatus.CREATED);
      }
    });

    it('normal: deve aceitar body sem status (usa NEUTRAL por padrão no service)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send(validBody)
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(mockIndicatorsService.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });

    it('boundary: deve aceitar name com 2 caracteres (mínimo)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({ ...validBody, name: 'AB' })
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
    });

    it('boundary: deve rejeitar name com 1 caractere (abaixo do mínimo) → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({ ...validBody, name: 'A' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('invalid: deve rejeitar status inválido → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({ ...validBody, status: 'INVALIDO' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockIndicatorsService.create).not.toHaveBeenCalled();
    });

    it('invalid: deve rejeitar payload sem name → 400', async () => {
      const { name: _n, ...withoutName } = validBody;
      await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send(withoutName)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('invalid: deve rejeitar campo não permitido (currentValue) → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({ ...validBody, currentValue: 999 })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('invalid: deve rejeitar campo não permitido (previousValue) → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({ ...validBody, previousValue: 500 })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('anti-hardcoding: deve criar com categoria OPERATIONAL e chartType LINE', async () => {
      const altIndicator = {
        ...mockIndicator,
        name: 'Taxa de Entrega',
        category: IndicatorCategory.OPERATIONAL,
        chartType: IndicatorChartType.LINE,
      };
      mockIndicatorsService.create.mockResolvedValueOnce(altIndicator);

      const res = await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({
          name: 'Taxa de Entrega',
          category: 'OPERATIONAL',
          chartType: 'LINE',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.category).toBe(IndicatorCategory.OPERATIONAL);
      expect(res.body.chartType).toBe(IndicatorChartType.LINE);
    });

    it('anti-hardcoding: deve criar com desiredDirection LOWER_IS_BETTER', async () => {
      const costIndicator = {
        ...mockIndicator,
        name: 'Custo Operacional',
        desiredDirection: IndicatorDesiredDirection.LOWER_IS_BETTER,
        status: IndicatorStatus.WARNING,
      };
      mockIndicatorsService.create.mockResolvedValueOnce(costIndicator);

      const res = await request(app.getHttpServer())
        .post('/api/v1/indicators')
        .send({
          name: 'Custo Operacional',
          category: 'OPERATIONAL',
          chartType: 'NUMBER',
          desiredDirection: 'LOWER_IS_BETTER',
          status: 'WARNING',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.status).toBe(IndicatorStatus.WARNING);
    });
  });

  // ── GET /api/v1/indicators ─────────────────────────────────────────────────

  describe('GET /api/v1/indicators', () => {
    it('normal: deve listar indicadores com paginação → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/indicators')
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(mockIndicatorsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('normal: deve filtrar por category=FINANCIAL → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/indicators?category=FINANCIAL')
        .expect(HttpStatus.OK);

      expect(mockIndicatorsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'FINANCIAL' }),
      );
    });

    it('normal: deve filtrar por status=WARNING → 200', async () => {
      mockIndicatorsService.findAll.mockResolvedValueOnce({
        ...mockPaginated,
        items: [{ ...mockIndicator, status: IndicatorStatus.WARNING }],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/indicators?status=WARNING')
        .expect(HttpStatus.OK);

      expect(res.body.items[0].status).toBe(IndicatorStatus.WARNING);
    });

    it('boundary: deve retornar lista vazia → 200', async () => {
      mockIndicatorsService.findAll.mockResolvedValueOnce({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/indicators')
        .expect(HttpStatus.OK);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.pagination.totalItems).toBe(0);
    });

    it('boundary: deve respeitar page e limit → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/indicators?page=2&limit=5')
        .expect(HttpStatus.OK);

      expect(mockIndicatorsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it('unaffected: deve filtrar por isActive=true sem afetar outros filtros → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/indicators?isActive=true')
        .expect(HttpStatus.OK);

      expect(mockIndicatorsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  // ── GET /api/v1/indicators/:id ─────────────────────────────────────────────

  describe('GET /api/v1/indicators/:id', () => {
    it('normal: deve retornar indicador por ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/indicators/${MOCK_ID}`)
        .expect(HttpStatus.OK);

      expect(res.body.id).toBe(MOCK_ID);
      expect(res.body.name).toBe('Receita Total');
      expect(res.body).toHaveProperty('analytics');
      expect(mockIndicatorsService.findOne).toHaveBeenCalledWith(MOCK_ID);
    });

    it('invalid: deve retornar 404 quando ID não existe', async () => {
      mockIndicatorsService.findOne.mockRejectedValueOnce(
        new NotFoundException('Indicador não encontrado.'),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/indicators/${MOCK_ID}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('invalid: deve retornar 400 para UUID inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/indicators/not-a-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('anti-hardcoding: outro UUID válido também passa pela validação', async () => {
      const otherId = 'bbccddee-1111-4111-b111-111111111111';
      mockIndicatorsService.findOne.mockResolvedValueOnce({
        ...mockIndicator,
        id: otherId,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/indicators/${otherId}`)
        .expect(HttpStatus.OK);

      expect(res.body.id).toBe(otherId);
    });
  });

  // ── GET /api/v1/indicators/:id/analytics ──────────────────────────────────

  describe('GET /api/v1/indicators/:id/analytics', () => {
    it('normal: deve retornar analytics calculados → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/indicators/${MOCK_ID}/analytics`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('currentValue', 1500);
      expect(res.body).toHaveProperty('variation', 50);
      expect(res.body).toHaveProperty('targetStatus');
      expect(res.body).toHaveProperty(
        'computedStatus',
        IndicatorStatus.SUCCESS,
      );
    });

    it('invalid: deve retornar 404 quando ID não existe', async () => {
      mockIndicatorsService.getAnalytics.mockRejectedValueOnce(
        new NotFoundException('Indicador não encontrado.'),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/indicators/${MOCK_ID}/analytics`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ── PATCH /api/v1/indicators/:id ──────────────────────────────────────────

  describe('PATCH /api/v1/indicators/:id', () => {
    it('normal: deve atualizar nome do indicador → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({ name: 'Receita Total Atualizada' })
        .expect(HttpStatus.OK);

      expect(res.body.name).toBe('Receita Total Atualizada');
      expect(mockIndicatorsService.update).toHaveBeenCalledWith(
        MOCK_ID,
        expect.objectContaining({ name: 'Receita Total Atualizada' }),
      );
    });

    it('normal: deve atualizar status para DANGER → 200', async () => {
      const dangerIndicator = {
        ...mockIndicator,
        status: IndicatorStatus.DANGER,
      };
      mockIndicatorsService.update.mockResolvedValueOnce(dangerIndicator);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({ status: 'DANGER' })
        .expect(HttpStatus.OK);

      expect(res.body.status).toBe(IndicatorStatus.DANGER);
    });

    it('normal: deve atualizar goalValue e desiredDirection → 200', async () => {
      mockIndicatorsService.update.mockResolvedValueOnce({
        ...mockIndicator,
        goalValue: 3000,
        desiredDirection: IndicatorDesiredDirection.LOWER_IS_BETTER,
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({ goalValue: 3000, desiredDirection: 'LOWER_IS_BETTER' })
        .expect(HttpStatus.OK);

      expect(res.body.goalValue).toBe(3000);
    });

    it('boundary: deve aceitar PATCH com body vazio (sem erros de validação) → 200', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({})
        .expect(HttpStatus.OK);
    });

    it('invalid: deve rejeitar status inválido no PATCH → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({ status: 'ERRADO' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockIndicatorsService.update).not.toHaveBeenCalled();
    });

    it('invalid: deve rejeitar UUID inválido → 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/indicators/invalid-id')
        .send({ name: 'Teste' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('anti-hardcoding: deve atualizar category para MARKETING → 200', async () => {
      mockIndicatorsService.update.mockResolvedValueOnce({
        ...mockIndicator,
        category: IndicatorCategory.MARKETING,
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/indicators/${MOCK_ID}`)
        .send({ category: 'MARKETING' })
        .expect(HttpStatus.OK);

      expect(res.body.category).toBe(IndicatorCategory.MARKETING);
    });
  });

  // ── DELETE /api/v1/indicators/:id ─────────────────────────────────────────

  describe('DELETE /api/v1/indicators/:id', () => {
    it('normal: deve excluir indicador → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/indicators/${MOCK_ID}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('id', MOCK_ID);
      expect(mockIndicatorsService.remove).toHaveBeenCalledWith(MOCK_ID);
    });

    it('invalid: deve retornar 404 quando ID não existe', async () => {
      mockIndicatorsService.remove.mockRejectedValueOnce(
        new NotFoundException('Indicador não encontrado.'),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/indicators/${MOCK_ID}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('invalid: deve retornar 400 para UUID inválido → 400', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/indicators/invalid-id')
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockIndicatorsService.remove).not.toHaveBeenCalled();
    });

    it('unaffected: DELETE não afeta outros indicadores (mock chamado 1 vez)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/indicators/${MOCK_ID}`)
        .expect(HttpStatus.OK);

      expect(mockIndicatorsService.remove).toHaveBeenCalledTimes(1);
      expect(mockIndicatorsService.remove).toHaveBeenCalledWith(MOCK_ID);
    });
  });

  // ── GET /api/v1/indicators/summary ────────────────────────────────────────

  describe('GET /api/v1/indicators/summary', () => {
    it('normal: deve retornar resumo dos indicadores → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/indicators/summary')
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('total', 1);
      expect(res.body).toHaveProperty('active', 1);
      expect(res.body).toHaveProperty('byStatus');
      expect(res.body.byStatus).toHaveProperty(IndicatorStatus.NEUTRAL);
    });
  });
});
