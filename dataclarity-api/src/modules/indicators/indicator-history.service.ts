import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateIndicatorHistoryDto } from './dto/create-indicator-history.dto';

export interface HistoryListResult {
  items: IndicatorHistoryRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type IndicatorHistoryRecord = {
  id: string;
  indicatorId: string;
  periodStart: Date;
  periodEnd: Date;
  value: unknown;
  goalValue: unknown;
  previousValue: unknown;
  variationPercent: unknown;
  status: string;
  notes: string | null;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class IndicatorHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── POST /indicators/:indicatorId/history ───────────────────────────────

  async create(
    indicatorId: string,
    dto: CreateIndicatorHistoryDto,
  ): Promise<IndicatorHistoryRecord> {
    await this.ensureIndicator(indicatorId);

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodEnd < periodStart) {
      throw new BadRequestException(
        'periodEnd não pode ser anterior a periodStart.',
      );
    }

    try {
      return (await this.prisma.indicatorHistory.create({
        data: {
          indicatorId,
          periodStart,
          periodEnd,
          value: dto.value ?? null,
          goalValue: dto.goalValue ?? null,
          previousValue: dto.previousValue ?? null,
          variationPercent: dto.variationPercent ?? null,
          status: dto.status,
          notes: dto.notes ?? null,
        },
      })) as IndicatorHistoryRecord;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          'Já existe um resultado histórico para este indicador neste período exato.',
        );
      }
      throw err;
    }
  }

  // ─── GET /indicators/:indicatorId/history ────────────────────────────────

  async findAll(
    indicatorId: string,
    query: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<HistoryListResult> {
    await this.ensureIndicator(indicatorId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = { indicatorId };

    if (query.startDate || query.endDate) {
      const periodFilter: Record<string, Date> = {};
      if (query.startDate) periodFilter['gte'] = new Date(query.startDate);
      if (query.endDate) periodFilter['lte'] = new Date(query.endDate);
      where['periodStart'] = periodFilter;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.indicatorHistory.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.indicatorHistory.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: items as IndicatorHistoryRecord[],
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

  // ─── GET /indicators/:indicatorId/history/:id ─────────────────────────────

  async findOne(
    indicatorId: string,
    id: string,
  ): Promise<IndicatorHistoryRecord> {
    await this.ensureIndicator(indicatorId);
    const record = await this.prisma.indicatorHistory.findFirst({
      where: { id, indicatorId },
    });
    if (!record) {
      throw new NotFoundException('Resultado histórico não encontrado.');
    }
    return record as IndicatorHistoryRecord;
  }

  // ─── DELETE /indicators/:indicatorId/history/:id ─────────────────────────

  async remove(
    indicatorId: string,
    id: string,
  ): Promise<IndicatorHistoryRecord> {
    await this.ensureIndicator(indicatorId);
    const record = await this.prisma.indicatorHistory.findFirst({
      where: { id, indicatorId },
    });
    if (!record) {
      throw new NotFoundException('Resultado histórico não encontrado.');
    }
    return (await this.prisma.indicatorHistory.delete({
      where: { id },
    })) as IndicatorHistoryRecord;
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async ensureIndicator(id: string) {
    const ind = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!ind) throw new NotFoundException('Indicador não encontrado.');
    return ind;
  }

  private isUniqueViolation(err: unknown): boolean {
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;
      return e['code'] === 'P2002';
    }
    return false;
  }
}
