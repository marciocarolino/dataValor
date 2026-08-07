import { AnalysisFilterDto } from './dto/analysis-filter.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { AnalysisEntity } from './entities/analysis.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisCategory } from './enums/analysis-category.enum';
import { ExecuteAnalysisResultDto } from './dto/execute-analysis-result.dto';
export declare class AnalysisController {
    private readonly analysisService;
    constructor(analysisService: AnalysisService);
    create(dto: CreateAnalysisDto): Promise<AnalysisEntity>;
    findFavorites(): Promise<AnalysisEntity[]>;
    findPublic(): Promise<AnalysisEntity[]>;
    getSummary(): Promise<ReturnType<AnalysisService['getSummary']>>;
    findByCategory(category: AnalysisCategory): Promise<AnalysisEntity[]>;
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
    findOne(id: string): Promise<AnalysisEntity>;
    update(id: string, dto: UpdateAnalysisDto): Promise<AnalysisEntity>;
    remove(id: string): Promise<AnalysisEntity>;
    execute(id: string): Promise<ExecuteAnalysisResultDto>;
    toggleFavorite(id: string): Promise<{
        id: string;
        name: string;
        isFavorite: boolean;
    }>;
}
