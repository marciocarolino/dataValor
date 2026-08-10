import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsInput,
  IndicatorAnalyticsService,
} from './indicator-analytics.service';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import type { CreateIndicatorDto } from './dto/create-indicator.dto';
import type { UpdateIndicatorDto } from './dto/update-indicator.dto';
import type { ListIndicatorsQueryDto } from './dto/list-indicators-query.dto';
import { IndicatorCategory } from './enums/indicator-category.enum';

export interface IndicatorSummary {
  total: number;
  active: number;
  inactive: number;
  categories: number;
  byStatus: Record<IndicatorStatus, number>;
}

type ByStatusMap = Record<IndicatorStatus, number>;

@Injectable()
export class IndicatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: IndicatorAnalyticsService,
  ) {}

  // ─── POST /indicators ─────────────────────────────────────────────────────

  async create(dto: CreateIndicatorDto) {
    // Backend é a fonte de verdade: ignorar currentValue, previousValue,
    // variation, daysRemaining e status enviados pelo frontend
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const { daysRemaining } = this.analytics.computeDaysRemaining(endDate);

    return this.prisma.indicator.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        formula: dto.formula ?? null,
        unit: dto.unit ?? null,
        goalValue: dto.goalValue ?? null,
        minimumGoalValue: dto.minimumGoalValue ?? null,
        maximumGoalValue: dto.maximumGoalValue ?? null,
        desiredDirection:
          dto.desiredDirection ?? IndicatorDesiredDirection.HIGHER_IS_BETTER,
        // campos calculados — inicialmente sem medições
        // status inicial pode ser sobrescrito pelo DTO (ex: INACTIVE para indicadores pausados)
        currentValue: null,
        previousValue: null,
        variation: null,
        status: dto.status ?? IndicatorStatus.NEUTRAL,
        // Periodicidade de Apuração — frequência com que o indicador gera um novo resultado
        frequency: dto.frequency ?? IndicatorFrequency.MONTHLY,
        // Método de Apuração — como o resultado do período é calculado
        aggregationType: dto.aggregationType ?? AggregationType.SUM,
        previousPeriod: dto.previousPeriod ?? null,
        color: dto.color ?? null,
        icon: dto.icon ?? null,
        chartType: dto.chartType,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate,
        daysRemaining,
        isActive: dto.isActive ?? true,
        showOnDashboard: dto.showOnDashboard ?? false,
        dashboardSlot: dto.dashboardSlot ?? null,
      },
    });
  }

  // ─── GET /indicators ──────────────────────────────────────────────────────

  async findAll(query: ListIndicatorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.showOnDashboard !== undefined
        ? { showOnDashboard: query.showOnDashboard }
        : {}),
      ...(query.desiredDirection
        ? { desiredDirection: query.desiredDirection }
        : {}),
      ...(query.name
        ? { name: { contains: query.name, mode: 'insensitive' as const } }
        : {}),
    };

    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.indicator.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          measurements: {
            orderBy: { referenceDate: 'desc' },
            take: 2,
            select: { value: true, referenceDate: true },
          },
        },
      }),
      this.prisma.indicator.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: items.map((ind) => this.withAnalytics(ind)),
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

  // ─── GET /indicators/:id ──────────────────────────────────────────────────

  async findOne(id: string) {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id },
      include: {
        measurements: {
          orderBy: { referenceDate: 'desc' },
          take: 2,
          select: { value: true, referenceDate: true },
        },
      },
    });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');
    return this.withAnalytics(indicator);
  }

  // ─── GET /indicators/:id/analytics ───────────────────────────────────────

  async getAnalytics(id: string) {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id },
      include: {
        measurements: {
          orderBy: { referenceDate: 'desc' },
          take: 2,
          select: { value: true, referenceDate: true },
        },
      },
    });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');

    const input = this.buildAnalyticsInput(indicator);
    return this.analytics.compute(input);
  }

  // ─── GET /indicators/:id/history ─────────────────────────────────────────

  async getHistory(id: string, startDate?: string, endDate?: string) {
    const indicator = await this.prisma.indicator.findUnique({ where: { id } });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');

    const where: Record<string, unknown> = { indicatorId: id };
    if (startDate || endDate) {
      const df: Record<string, Date> = {};
      if (startDate) df['gte'] = new Date(startDate);
      if (endDate) df['lte'] = new Date(endDate);
      where['referenceDate'] = df;
    }

    return this.prisma.indicatorMeasurement.findMany({
      where,
      orderBy: { referenceDate: 'asc' },
    });
  }

  // ─── GET /indicators/dashboard/summary ───────────────────────────────────

  async getDashboardSummary(): Promise<IndicatorSummary> {
    const [total, active, inactive, byStatusRaw, catRaw] = await Promise.all([
      this.prisma.indicator.count(),
      // Ativo = isActive=true
      this.prisma.indicator.count({ where: { isActive: true } }),
      // Inativo = isActive=false
      this.prisma.indicator.count({ where: { isActive: false } }),
      this.prisma.indicator.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.indicator.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
    ]);

    const byStatus: ByStatusMap = {
      [IndicatorStatus.SUCCESS]: 0,
      [IndicatorStatus.WARNING]: 0,
      [IndicatorStatus.DANGER]: 0,
      [IndicatorStatus.NEUTRAL]: 0,
    };

    for (const row of byStatusRaw) {
      if (row.status in byStatus) {
        byStatus[row.status as IndicatorStatus] = row._count.status;
      }
    }

    return {
      total,
      active,
      inactive,
      categories: catRaw.length,
      byStatus,
    };
  }

  // ─── GET /indicators/dashboard (lista rápida) ─────────────────────────────

  async findDashboard() {
    const items = await this.prisma.indicator.findMany({
      where: { showOnDashboard: true, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        measurements: {
          orderBy: { referenceDate: 'desc' },
          take: 2,
          select: { value: true, referenceDate: true },
        },
      },
    });
    return items.map((ind) => this.withAnalytics(ind));
  }

  async findByCategory(category: IndicatorCategory) {
    const items = await this.prisma.indicator.findMany({
      where: { category, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        measurements: {
          orderBy: { referenceDate: 'desc' },
          take: 2,
          select: { value: true, referenceDate: true },
        },
      },
    });
    return items.map((ind) => this.withAnalytics(ind));
  }

  // ─── PATCH /indicators/:id ────────────────────────────────────────────────

  async update(id: string, dto: UpdateIndicatorDto) {
    const existing = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true, endDate: true, desiredDirection: true },
    });
    if (!existing) throw new NotFoundException('Indicador não encontrado.');

    const resolvedEndDate: Date | null =
      'endDate' in dto
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existing.endDate;

    const { daysRemaining } =
      this.analytics.computeDaysRemaining(resolvedEndDate);

    return this.prisma.indicator.update({
      where: { id },
      data: {
        // Campos de configuração — aceitos do front
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.goalValue !== undefined && { goalValue: dto.goalValue }),
        ...(dto.minimumGoalValue !== undefined && {
          minimumGoalValue: dto.minimumGoalValue ?? null,
        }),
        ...(dto.maximumGoalValue !== undefined && {
          maximumGoalValue: dto.maximumGoalValue ?? null,
        }),
        ...(dto.desiredDirection !== undefined && {
          desiredDirection: dto.desiredDirection,
        }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.aggregationType !== undefined && {
          aggregationType: dto.aggregationType,
        }),
        ...(dto.previousPeriod !== undefined && {
          previousPeriod: dto.previousPeriod,
        }),
        ...('color' in dto && { color: dto.color ?? null }),
        ...('icon' in dto && { icon: dto.icon ?? null }),
        ...(dto.chartType !== undefined && { chartType: dto.chartType }),
        ...('startDate' in dto && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...('endDate' in dto && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        daysRemaining,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.showOnDashboard !== undefined && {
          showOnDashboard: dto.showOnDashboard,
        }),
        ...('dashboardSlot' in dto && {
          dashboardSlot: dto.dashboardSlot ?? null,
        }),
        // status: aceito do DTO quando explicitamente enviado
        // após cada medição, syncIndicatorCache recalcula e pode sobrescrever
        ...(dto.status !== undefined && { status: dto.status }),
        // currentValue, previousValue, variation:
        // são ignorados do DTO — calculados pelo analytics após cada medição
      },
    });
  }

  // ─── DELETE /indicators/:id ───────────────────────────────────────────────

  async remove(id: string) {
    const exists = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Indicador não encontrado.');
    return this.prisma.indicator.delete({ where: { id } });
  }

  // ─── Antigo getSummary (mantido para compatibilidade) ─────────────────────

  async getSummary() {
    return this.getDashboardSummary();
  }

  // ─── Helpers internos ─────────────────────────────────────────────────────

  private buildAnalyticsInput(indicator: {
    goalValue: unknown;
    minimumGoalValue: unknown;
    maximumGoalValue: unknown;
    desiredDirection: string;
    endDate: Date | null;
    measurements?: { value: unknown; referenceDate: Date }[];
  }): AnalyticsInput {
    return {
      measurements: (indicator.measurements ?? []).map((m) => ({
        value: m.value as { toNumber(): number },
        referenceDate: m.referenceDate,
      })),
      goalValue: indicator.goalValue as { toNumber(): number } | null,
      minimumGoalValue: indicator.minimumGoalValue as {
        toNumber(): number;
      } | null,
      maximumGoalValue: indicator.maximumGoalValue as {
        toNumber(): number;
      } | null,
      desiredDirection:
        (indicator.desiredDirection as IndicatorDesiredDirection) ??
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
      endDate: indicator.endDate,
    };
  }

  private withAnalytics<
    T extends {
      goalValue: unknown;
      minimumGoalValue: unknown;
      maximumGoalValue: unknown;
      desiredDirection: string;
      endDate: Date | null;
      measurements?: { value: unknown; referenceDate: Date }[];
      [key: string]: unknown;
    },
  >(indicator: T) {
    const input = this.buildAnalyticsInput(indicator);
    const analyticsResult = this.analytics.compute(input);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { measurements: _m, ...rest } = indicator;
    return {
      ...rest,
      analytics: {
        currentValue: analyticsResult.currentValue,
        previousValue: analyticsResult.previousValue,
        variation: analyticsResult.variation,
        variationCalculationStatus: analyticsResult.variationCalculationStatus,
        targetAchievementPercentage:
          analyticsResult.targetAchievementPercentage,
        targetDifference: analyticsResult.targetDifference,
        targetStatus: analyticsResult.targetStatus,
        daysRemaining: analyticsResult.daysRemaining,
        isOverdue: analyticsResult.isOverdue,
        lastMeasurementDate: analyticsResult.lastMeasurementDate,
      },
    };
  }
}
