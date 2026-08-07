/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateAnalysisDto } from './dto/create-analysis.dto';
import type { UpdateAnalysisDto } from './dto/update-analysis.dto';
import type { AnalysisFilterDto } from './dto/analysis-filter.dto';
import { AnalysisCategory } from './enums/analysis-category.enum';
import type { ExecuteAnalysisResultDto } from './dto/execute-analysis-result.dto';

export interface AnalysisPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AnalysisSummary {
  total: number;
  favorites: number;
  isPublic: number;
  isPrivate: number;
  categories: AnalysisCategory[];
}

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any {
    return this.prisma as any;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreateAnalysisDto) {
    return await this.db.analysis.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        chartType: dto.chartType,
        category: dto.category,
        dataset: dto.dataset ?? null,
        metric: dto.metric ?? null,
        aggregation: dto.aggregation,
        groupBy: dto.groupBy ?? null,
        dateField: dto.dateField ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        filters: dto.filters ? JSON.parse(dto.filters) : null,
        isFavorite: dto.isFavorite ?? false,
        isPublic: dto.isPublic ?? false,
        createdBy: dto.createdBy ?? null,
      },
    });
  }

  async findAll(query: AnalysisFilterDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = {
      ...(query.name
        ? { name: { contains: query.name, mode: 'insensitive' } }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.chartType ? { chartType: query.chartType } : {}),
      ...(query.isFavorite !== undefined
        ? { isFavorite: query.isFavorite }
        : {}),
      ...(query.isPublic !== undefined ? { isPublic: query.isPublic } : {}),
      ...(query.createdBy ? { createdBy: query.createdBy } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    const [items, totalItems]: [any[], number] = await Promise.all([
      this.db.analysis.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.analysis.count({ where }),
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

  async findOne(id: string) {
    const analysis = await this.db.analysis.findUnique({ where: { id } });
    if (!analysis) throw new NotFoundException('Análise não encontrada.');
    return analysis;
  }

  async update(id: string, dto: UpdateAnalysisDto) {
    const exists = await this.db.analysis.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Análise não encontrada.');

    return this.db.analysis.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.chartType !== undefined && { chartType: dto.chartType }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.dataset !== undefined && { dataset: dto.dataset }),
        ...(dto.metric !== undefined && { metric: dto.metric }),
        ...(dto.aggregation !== undefined && { aggregation: dto.aggregation }),
        ...(dto.groupBy !== undefined && { groupBy: dto.groupBy }),
        ...(dto.dateField !== undefined && { dateField: dto.dateField }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.filters !== undefined && {
          filters: dto.filters ? JSON.parse(dto.filters) : null,
        }),
        ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.createdBy !== undefined && { createdBy: dto.createdBy }),
      },
    });
  }

  async remove(id: string) {
    const exists = await this.db.analysis.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Análise não encontrada.');
    return this.db.analysis.delete({ where: { id } });
  }

  // ─── Endpoints Especiais ────────────────────────────────────────────────────

  async findFavorites() {
    return await this.db.analysis.findMany({
      where: { isFavorite: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findPublic() {
    return await this.db.analysis.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCategory(category: AnalysisCategory) {
    return await this.db.analysis.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async toggleFavorite(id: string) {
    const analysis = await this.db.analysis.findUnique({
      where: { id },
      select: { id: true, isFavorite: true },
    });
    if (!analysis) throw new NotFoundException('Análise não encontrada.');

    return this.db.analysis.update({
      where: { id },
      data: { isFavorite: !analysis.isFavorite },
      select: { id: true, name: true, isFavorite: true },
    });
  }

  async getSummary(): Promise<AnalysisSummary> {
    const [total, favorites, isPublic, isPrivate, grouped] = await Promise.all([
      this.db.analysis.count(),
      this.db.analysis.count({ where: { isFavorite: true } }),
      this.db.analysis.count({ where: { isPublic: true } }),
      this.db.analysis.count({ where: { isPublic: false } }),
      this.db.analysis.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
    ]);

    const categories = (grouped as Array<{ category: string }>).map(
      (g) => g.category as unknown as AnalysisCategory,
    );

    return {
      total: total as number,
      favorites: favorites as number,
      isPublic: isPublic as number,
      isPrivate: isPrivate as number,
      categories,
    };
  }

  async execute(id: string): Promise<ExecuteAnalysisResultDto> {
    const analysis: any = await this.db.analysis.findUnique({ where: { id } });
    if (!analysis) throw new NotFoundException('Análise não encontrada.');

    // ── Preparado para integração futura com Datasets, Indicators, AI Insights e Reports ──
    // Quando integrado, este método substituirá os dados simulados por consultas reais
    // sem necessidade de alterar o contrato do frontend.
    return this.buildSimulatedResult(analysis);
  }

  /**
   * Gera um resultado simulado no contrato padronizado `ExecuteAnalysisResultDto`.
   * Futuramente será substituído por `buildResultFromDataset(analysis, dataset)`.
   */
  private buildSimulatedResult(analysis: any): ExecuteAnalysisResultDto {
    const chartType = (analysis.chartType as string) ?? 'BAR';
    const metricName = (analysis.metric as string | null) ?? 'valor';
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];

    // Para KPI: retorna dataset com um único ponto
    const isKpi = chartType === 'KPI';
    const rawData = isKpi
      ? [Math.floor(Math.random() * 1_000_000)]
      : labels.map((_, i) => Math.floor(Math.random() * 100_000) + i * 8_000);

    const total = rawData.reduce((acc, v) => acc + v, 0);
    const lastTwo = rawData.length >= 2 ? rawData.slice(-2) : null;
    const growth =
      lastTwo && lastTwo[0] > 0
        ? parseFloat(
            (((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100).toFixed(1),
          )
        : null;

    return {
      title: (analysis.name as string) ?? 'Análise',
      description: (analysis.description as string | null) ?? null,
      chartType,
      labels: isKpi ? [metricName] : labels,
      datasets: [
        {
          label: metricName,
          data: rawData,
        },
      ],
      summary: {
        total,
        growth,
        records: rawData.length,
      },
    };
  }
}
