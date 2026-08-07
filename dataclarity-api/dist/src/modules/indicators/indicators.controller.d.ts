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
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.IndicatorStatus;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            category: import(".prisma/client").$Enums.IndicatorCategory;
            formula: string | null;
            unit: string | null;
            goalValue: number | null;
            currentValue: number | null;
            previousValue: number | null;
            previousPeriod: import(".prisma/client").$Enums.IndicatorPeriod | null;
            variation: number | null;
            color: string | null;
            icon: string | null;
            chartType: import(".prisma/client").$Enums.IndicatorChartType;
            showOnDashboard: boolean;
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
