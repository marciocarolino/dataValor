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
                referenceDate: Date;
                value: import("@prisma/client-runtime-utils").Decimal;
            }[];
        } & {
            id: string;
            name: string;
            description: string | null;
            category: import(".prisma/client").$Enums.IndicatorCategory;
            formula: string | null;
            unit: string | null;
            goalValue: import("@prisma/client-runtime-utils").Decimal | null;
            minimumGoalValue: import("@prisma/client-runtime-utils").Decimal | null;
            maximumGoalValue: import("@prisma/client-runtime-utils").Decimal | null;
            desiredDirection: import(".prisma/client").$Enums.IndicatorDesiredDirection;
            frequency: import(".prisma/client").$Enums.IndicatorFrequency;
            currentValue: import("@prisma/client-runtime-utils").Decimal | null;
            previousValue: import("@prisma/client-runtime-utils").Decimal | null;
            previousPeriod: import(".prisma/client").$Enums.IndicatorPeriod | null;
            variation: import("@prisma/client-runtime-utils").Decimal | null;
            status: import(".prisma/client").$Enums.IndicatorStatus;
            color: string | null;
            icon: string | null;
            chartType: import(".prisma/client").$Enums.IndicatorChartType;
            startDate: Date | null;
            endDate: Date | null;
            daysRemaining: number | null;
            dashboardSlot: string | null;
            isActive: boolean;
            showOnDashboard: boolean;
            createdAt: Date;
            updatedAt: Date;
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
