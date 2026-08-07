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
export declare class IndicatorsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get db();
    create(dto: CreateIndicatorDto): Promise<any>;
    findAll(query: ListIndicatorsQueryDto): Promise<any>;
    findOne(id: string): Promise<any>;
    findDashboard(): Promise<any[]>;
    findByCategory(category: IndicatorCategory): Promise<any[]>;
    getSummary(): Promise<IndicatorSummary>;
    update(id: string, dto: UpdateIndicatorDto): Promise<any>;
    remove(id: string): Promise<any>;
}
