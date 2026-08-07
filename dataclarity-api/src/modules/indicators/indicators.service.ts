/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateIndicatorDto } from './dto/create-indicator.dto';
import type { UpdateIndicatorDto } from './dto/update-indicator.dto';
import type { ListIndicatorsQueryDto } from './dto/list-indicators-query.dto';
import { IndicatorCategory } from './enums/indicator-category.enum';

export interface IndicatorPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IndicatorSummary {
  total: number;
  active: number;
  inactive: number;
  categories: IndicatorCategory[];
}

@Injectable()
export class IndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIndicatorDto) {
    return await this.prisma.indicator.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        formula: dto.formula ?? null,
        unit: dto.unit ?? null,
        goalValue: dto.goalValue ?? null,
        currentValue: dto.currentValue ?? null,
        previousValue: dto.previousValue ?? null,
        previousPeriod: dto.previousPeriod ?? null,
        variation: dto.variation ?? null,
        status: dto.status,
        color: dto.color ?? null,
        icon: dto.icon ?? null,
        chartType: dto.chartType,
        isActive: dto.isActive ?? true,
        showOnDashboard: dto.showOnDashboard ?? false,
      },
    });
  }

  async findAll(query: ListIndicatorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
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
      }),
      this.prisma.indicator.count({ where }),
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
    const indicator = await this.prisma.indicator.findUnique({ where: { id } });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');
    return indicator;
  }

  async findDashboard() {
    return await this.prisma.indicator.findMany({
      where: { showOnDashboard: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: IndicatorCategory) {
    return await this.prisma.indicator.findMany({
      where: { category, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSummary(): Promise<IndicatorSummary> {
    const [total, active, inactive, grouped] = await Promise.all([
      this.prisma.indicator.count(),
      this.prisma.indicator.count({ where: { isActive: true } }),
      this.prisma.indicator.count({ where: { isActive: false } }),
      this.prisma.indicator.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
    ]);

    const categories = grouped.map(
      (g) => g.category as unknown as IndicatorCategory,
    );

    return { total, active, inactive, categories };
  }

  async update(id: string, dto: UpdateIndicatorDto) {
    const exists = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Indicador não encontrado.');

    return this.prisma.indicator.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.formula !== undefined && { formula: dto.formula }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.goalValue !== undefined && { goalValue: dto.goalValue }),
        ...(dto.currentValue !== undefined && {
          currentValue: dto.currentValue,
        }),
        ...(dto.previousValue !== undefined && {
          previousValue: dto.previousValue,
        }),
        ...(dto.previousPeriod !== undefined && {
          previousPeriod: dto.previousPeriod,
        }),
        ...(dto.variation !== undefined && { variation: dto.variation }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.chartType !== undefined && { chartType: dto.chartType }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.showOnDashboard !== undefined && {
          showOnDashboard: dto.showOnDashboard,
        }),
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Indicador não encontrado.');

    return this.prisma.indicator.delete({ where: { id } });
  }
}
