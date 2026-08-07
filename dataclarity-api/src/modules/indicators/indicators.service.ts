/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
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

  private get db(): any {
    return this.prisma as any;
  }

  async create(dto: CreateIndicatorDto): Promise<any> {
    return await this.db.indicator.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        formula: dto.formula ?? null,
        unit: dto.unit ?? null,
        goalValue: dto.goalValue ?? null,
        currentValue: dto.currentValue ?? null,
        previousValue: dto.previousValue ?? null,
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

  async findAll(query: ListIndicatorsQueryDto): Promise<any> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.name
        ? { name: { contains: query.name, mode: 'insensitive' } }
        : {}),
    };

    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    const [items, totalItems]: [any[], number] = await Promise.all([
      this.db.indicator.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.indicator.count({ where }),
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

  async findOne(id: string): Promise<any> {
    const indicator = await this.db.indicator.findUnique({ where: { id } });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');
    return indicator;
  }

  async findDashboard(): Promise<any[]> {
    return await this.db.indicator.findMany({
      where: { showOnDashboard: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: IndicatorCategory): Promise<any[]> {
    return await this.db.indicator.findMany({
      where: { category, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSummary(): Promise<IndicatorSummary> {
    const [total, active, inactive, grouped]: [
      number,
      number,
      number,
      Array<{ category: string }>,
    ] = await Promise.all([
      this.db.indicator.count(),
      this.db.indicator.count({ where: { isActive: true } }),
      this.db.indicator.count({ where: { isActive: false } }),
      this.db.indicator.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
    ]);

    const categories = grouped.map(
      (g) => g.category as unknown as IndicatorCategory,
    );

    return { total, active, inactive, categories };
  }

  async update(id: string, dto: UpdateIndicatorDto): Promise<any> {
    const exists = await this.db.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Indicador não encontrado.');

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.category !== undefined) data['category'] = dto.category;
    if (dto.formula !== undefined) data['formula'] = dto.formula;
    if (dto.unit !== undefined) data['unit'] = dto.unit;
    if (dto.goalValue !== undefined) data['goalValue'] = dto.goalValue;
    if (dto.currentValue !== undefined) data['currentValue'] = dto.currentValue;
    if (dto.previousValue !== undefined)
      data['previousValue'] = dto.previousValue;
    if (dto.variation !== undefined) data['variation'] = dto.variation;
    if (dto.status !== undefined) data['status'] = dto.status;
    if (dto.color !== undefined) data['color'] = dto.color;
    if (dto.icon !== undefined) data['icon'] = dto.icon;
    if (dto.chartType !== undefined) data['chartType'] = dto.chartType;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.showOnDashboard !== undefined)
      data['showOnDashboard'] = dto.showOnDashboard;

    return this.db.indicator.update({ where: { id }, data });
  }

  async remove(id: string): Promise<any> {
    const exists = await this.db.indicator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Indicador não encontrado.');

    return this.db.indicator.delete({ where: { id } });
  }
}
