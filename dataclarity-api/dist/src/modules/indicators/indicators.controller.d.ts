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
    getDashboardSummary(): Promise<ReturnType<IndicatorsService['getDashboardSummary']>>;
    getSummary(): Promise<ReturnType<IndicatorsService['getSummary']>>;
    findByCategory(category: IndicatorCategory): Promise<IndicatorEntity[]>;
    findAll(query: ListIndicatorsQueryDto): Promise<{
        items: (Omit<{
            measurements: {
                value: import("@prisma/client-runtime-utils").Decimal;
                referenceDate: Date;
            }[];
        } & {
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
            minimumGoalValue: import("@prisma/client-runtime-utils").Decimal | null;
            maximumGoalValue: import("@prisma/client-runtime-utils").Decimal | null;
            desiredDirection: import(".prisma/client").$Enums.IndicatorDesiredDirection;
            previousPeriod: import(".prisma/client").$Enums.IndicatorPeriod | null;
            chartType: import(".prisma/client").$Enums.IndicatorChartType;
            color: string | null;
            icon: string | null;
            startDate: Date | null;
            endDate: Date | null;
            showOnDashboard: boolean;
            dashboardSlot: string | null;
            currentValue: import("@prisma/client-runtime-utils").Decimal | null;
            previousValue: import("@prisma/client-runtime-utils").Decimal | null;
            variation: import("@prisma/client-runtime-utils").Decimal | null;
            daysRemaining: number | null;
        }, "measurements"> & {
            analytics: {
                currentValue: number | null;
                previousValue: number | null;
                variation: number | null;
                variationCalculationStatus: import("./enums/indicator-variation-status.enum").IndicatorVariationStatus;
                targetAchievementPercentage: number | null;
                targetDifference: number | null;
                targetStatus: import("./enums/indicator-target-status.enum").IndicatorTargetStatus;
                daysRemaining: number | null;
                isOverdue: boolean;
                lastMeasurementDate: string | null;
            };
        })[];
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
