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
export declare class IndicatorHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(indicatorId: string, dto: CreateIndicatorHistoryDto): Promise<IndicatorHistoryRecord>;
    findAll(indicatorId: string, query?: {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<HistoryListResult>;
    findOne(indicatorId: string, id: string): Promise<IndicatorHistoryRecord>;
    remove(indicatorId: string, id: string): Promise<IndicatorHistoryRecord>;
    private ensureIndicator;
    private isUniqueViolation;
}
