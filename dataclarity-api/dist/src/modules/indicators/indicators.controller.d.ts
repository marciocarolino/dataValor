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
            status: import(".prisma/client").$Enums.IndicatorStatus;
            description: string | null;
            name: string;
            createdAt: Date;
            id: string;
            updatedAt: Date;
            isActive: boolean;
            category: import(".prisma/client").$Enums.IndicatorCategory;
            formula: string | null;
            unit: string | null;
            goalValue: import("@prisma/client-runtime-utils").Decimal | null;
            currentValue: import("@prisma/client-runtime-utils").Decimal | null;
            previousValue: import("@prisma/client-runtime-utils").Decimal | null;
            previousPeriod: import(".prisma/client").$Enums.IndicatorPeriod | null;
            variation: import("@prisma/client-runtime-utils").Decimal | null;
            color: string | null;
            icon: string | null;
            chartType: import(".prisma/client").$Enums.IndicatorChartType;
            startDate: Date | null;
            endDate: Date | null;
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
