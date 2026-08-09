import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { MeasurementsService } from './measurements.service';
import { IndicatorsService } from './indicators.service';
export declare class MeasurementsController {
    private readonly measurementsService;
    private readonly indicatorsService;
    constructor(measurementsService: MeasurementsService, indicatorsService: IndicatorsService);
    create(indicatorId: string, dto: CreateMeasurementDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    upsert(indicatorId: string, dto: CreateMeasurementDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    findAll(indicatorId: string, startDate?: string, endDate?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }[]>;
    update(indicatorId: string, measurementId: string, dto: UpdateMeasurementDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    remove(indicatorId: string, measurementId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    getAnalytics(indicatorId: string): Promise<import("./indicator-analytics.service").AnalyticsResult>;
    getHistory(indicatorId: string, startDate?: string, endDate?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        value: import("@prisma/client-runtime-utils").Decimal;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }[]>;
}
