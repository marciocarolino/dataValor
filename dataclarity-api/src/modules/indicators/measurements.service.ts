import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsInput,
  IndicatorAnalyticsService,
} from './indicator-analytics.service';
import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';
import type { CreateMeasurementDto } from './dto/create-measurement.dto';
import type { UpdateMeasurementDto } from './dto/update-measurement.dto';

@Injectable()
export class MeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: IndicatorAnalyticsService,
  ) {}

  // ─── POST /indicators/:indicatorId/measurements ──────────────────────────

  async create(indicatorId: string, dto: CreateMeasurementDto) {
    const indicator = await this.ensureIndicator(indicatorId);

    this.validateDates(dto.periodStart, dto.periodEnd);

    const refDate = new Date(dto.referenceDate);

    try {
      const measurement = await this.prisma.indicatorMeasurement.create({
        data: {
          indicatorId,
          value: dto.value,
          referenceDate: refDate,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          source: dto.source ?? null,
          notes: dto.notes ?? null,
        },
      });

      await this.syncIndicatorCache(indicatorId, indicator);
      return measurement;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Já existe uma medição para o indicador "${indicator.name}" na data ${dto.referenceDate}.`,
        );
      }
      throw err;
    }
  }

  // ─── POST /indicators/:indicatorId/measurements/upsert ──────────────────

  /**
   * Cria ou atualiza uma medição para a data informada (upsert).
   * Se já existe uma medição para o indicador naquela data, atualiza o valor.
   * Se não existe, cria uma nova.
   * Ideal para o fluxo de edição de indicador no frontend.
   */
  async upsert(indicatorId: string, dto: CreateMeasurementDto) {
    const indicator = await this.ensureIndicator(indicatorId);
    this.validateDates(dto.periodStart, dto.periodEnd);

    const refDate = new Date(dto.referenceDate);

    const existing = await this.prisma.indicatorMeasurement.findUnique({
      where: {
        indicatorId_referenceDate: { indicatorId, referenceDate: refDate },
      },
    });

    if (existing) {
      const updated = await this.prisma.indicatorMeasurement.update({
        where: { id: existing.id },
        data: {
          value: dto.value,
          ...(dto.periodStart !== undefined && {
            periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          }),
          ...(dto.periodEnd !== undefined && {
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          }),
          ...(dto.source !== undefined && { source: dto.source ?? null }),
          ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        },
      });
      await this.syncIndicatorCache(indicatorId, indicator);
      return updated;
    } else {
      const created = await this.prisma.indicatorMeasurement.create({
        data: {
          indicatorId,
          value: dto.value,
          referenceDate: refDate,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          source: dto.source ?? null,
          notes: dto.notes ?? null,
        },
      });
      await this.syncIndicatorCache(indicatorId, indicator);
      return created;
    }
  }

  // ─── GET /indicators/:indicatorId/measurements ───────────────────────────

  async findAll(
    indicatorId: string,
    filters?: { startDate?: string; endDate?: string },
  ) {
    await this.ensureIndicator(indicatorId);

    const where: Record<string, unknown> = { indicatorId };
    if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDate) dateFilter['gte'] = new Date(filters.startDate);
      if (filters.endDate) dateFilter['lte'] = new Date(filters.endDate);
      where['referenceDate'] = dateFilter;
    }

    return this.prisma.indicatorMeasurement.findMany({
      where,
      orderBy: { referenceDate: 'desc' },
    });
  }

  // ─── PATCH /indicators/:indicatorId/measurements/:id ────────────────────

  async update(
    indicatorId: string,
    measurementId: string,
    dto: UpdateMeasurementDto,
  ) {
    const indicator = await this.ensureIndicator(indicatorId);
    const existing = await this.ensureMeasurement(measurementId, indicatorId);

    // Resolve datas para validação
    const periodStart =
      dto.periodStart !== undefined
        ? dto.periodStart
        : existing.periodStart?.toISOString();
    const periodEnd =
      dto.periodEnd !== undefined
        ? dto.periodEnd
        : existing.periodEnd?.toISOString();
    this.validateDates(periodStart, periodEnd);

    try {
      const updated = await this.prisma.indicatorMeasurement.update({
        where: { id: measurementId },
        data: {
          ...(dto.value !== undefined && { value: dto.value }),
          ...(dto.referenceDate !== undefined && {
            referenceDate: new Date(dto.referenceDate),
          }),
          ...(dto.periodStart !== undefined && {
            periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          }),
          ...(dto.periodEnd !== undefined && {
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          }),
          ...(dto.source !== undefined && { source: dto.source ?? null }),
          ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        },
      });

      await this.syncIndicatorCache(indicatorId, indicator);
      return updated;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Já existe uma medição para esse indicador na data informada.`,
        );
      }
      throw err;
    }
  }

  // ─── DELETE /indicators/:indicatorId/measurements/:id ───────────────────

  async remove(indicatorId: string, measurementId: string) {
    const indicator = await this.ensureIndicator(indicatorId);
    await this.ensureMeasurement(measurementId, indicatorId);

    const deleted = await this.prisma.indicatorMeasurement.delete({
      where: { id: measurementId },
    });

    await this.syncIndicatorCache(indicatorId, indicator);
    return deleted;
  }

  // ─── Sincronização do cache do Indicator ─────────────────────────────────

  /**
   * Recalcula e atualiza os campos de cache do Indicator sempre que uma
   * medição for criada, editada ou excluída. Garante que currentValue,
   * previousValue, variation, daysRemaining e status estejam sempre atualizados.
   */
  async syncIndicatorCache(
    indicatorId: string,
    indicator?: Awaited<ReturnType<typeof this.ensureIndicator>>,
  ) {
    const ind =
      indicator ??
      (await this.prisma.indicator.findUnique({ where: { id: indicatorId } }));
    if (!ind) return;

    // Buscar as 2 medições mais recentes para o analytics
    const recentMeasurements = await this.prisma.indicatorMeasurement.findMany({
      where: { indicatorId },
      orderBy: { referenceDate: 'desc' },
      take: 2,
      select: { value: true, referenceDate: true },
    });

    const input: AnalyticsInput = {
      measurements: recentMeasurements,
      goalValue: ind.goalValue,
      minimumGoalValue: ind.minimumGoalValue,
      maximumGoalValue: ind.maximumGoalValue,
      desiredDirection:
        (ind.desiredDirection as IndicatorDesiredDirection) ??
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
      endDate: ind.endDate,
    };

    const result = this.analytics.compute(input);

    await this.prisma.indicator.update({
      where: { id: indicatorId },
      data: {
        currentValue: result.currentValue,
        previousValue: result.previousValue,
        variation: result.variation,
        daysRemaining: result.daysRemaining,
        status: result.computedStatus,
      },
    });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async ensureIndicator(id: string) {
    const ind = await this.prisma.indicator.findUnique({ where: { id } });
    if (!ind) throw new NotFoundException('Indicador não encontrado.');
    return ind;
  }

  private async ensureMeasurement(id: string, indicatorId: string) {
    const m = await this.prisma.indicatorMeasurement.findFirst({
      where: { id, indicatorId },
    });
    if (!m)
      throw new NotFoundException(
        `Medição "${id}" não encontrada para este indicador.`,
      );
    return m;
  }

  private validateDates(
    periodStart?: string | null,
    periodEnd?: string | null,
  ) {
    if (periodStart && periodEnd) {
      if (new Date(periodEnd) < new Date(periodStart)) {
        throw new BadRequestException(
          'periodEnd não pode ser anterior a periodStart.',
        );
      }
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;
      return e['code'] === 'P2002';
    }
    return false;
  }
}
