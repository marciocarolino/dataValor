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
export declare class AnalysisService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get db();
    create(dto: CreateAnalysisDto): Promise<any>;
    findAll(query: AnalysisFilterDto): Promise<{
        items: any[];
        pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateAnalysisDto): Promise<any>;
    remove(id: string): Promise<any>;
    findFavorites(): Promise<any>;
    findPublic(): Promise<any>;
    findByCategory(category: AnalysisCategory): Promise<any>;
    toggleFavorite(id: string): Promise<any>;
    getSummary(): Promise<AnalysisSummary>;
    execute(id: string): Promise<ExecuteAnalysisResultDto>;
    private buildSimulatedResult;
}
