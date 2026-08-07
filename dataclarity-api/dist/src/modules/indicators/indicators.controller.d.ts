import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { ListIndicatorsQueryDto } from './dto/list-indicators-query.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { IndicatorEntity } from './entities/indicator.entity';
import { IndicatorsService } from './indicators.service';
import { IndicatorCategory } from './enums/indicator-category.enum';
export declare class IndicatorsController {
    private readonly indicatorsService;
    constructor(indicatorsService: IndicatorsService);
    create(dto: CreateIndicatorDto): Promise<IndicatorEntity>;
    findDashboard(): Promise<IndicatorEntity[]>;
    getSummary(): Promise<ReturnType<IndicatorsService['getSummary']>>;
    findByCategory(category: IndicatorCategory): Promise<IndicatorEntity[]>;
    findAll(query: ListIndicatorsQueryDto): Promise<{
        items: {
            id: string;
            name: string;
            description: string | null;
            category: import(".prisma/client").$Enums.IndicatorCategory;
            formula: string | null;
            unit: string | null;
            goalValue: number | null;
            currentValue: number | null;
            previousValue: number | null;
            variation: number | null;
            status: import(".prisma/client").$Enums.IndicatorStatus;
            color: string | null;
            icon: string | null;
            chartType: import(".prisma/client").$Enums.IndicatorChartType;
            isActive: boolean;
            showOnDashboard: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findOne(id: string): Promise<IndicatorEntity>;
    update(id: string, dto: UpdateIndicatorDto): Promise<IndicatorEntity>;
    remove(id: string): Promise<IndicatorEntity>;
}
