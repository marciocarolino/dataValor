import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import type { CreateMeasurementDto } from './dto/create-measurement.dto';
import type { UpdateMeasurementDto } from './dto/update-measurement.dto';
export declare class MeasurementsService {
    private readonly prisma;
    private readonly analytics;
    constructor(prisma: PrismaService, analytics: IndicatorAnalyticsService);
    create(indicatorId: string, dto: CreateMeasurementDto): Promise<{
        value: import("@prisma/client-runtime-utils").Decimal;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    upsert(indicatorId: string, dto: CreateMeasurementDto): Promise<{
        value: import("@prisma/client-runtime-utils").Decimal;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    findAll(indicatorId: string, filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        value: import("@prisma/client-runtime-utils").Decimal;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }[]>;
    update(indicatorId: string, measurementId: string, dto: UpdateMeasurementDto): Promise<{
        value: import("@prisma/client-runtime-utils").Decimal;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    remove(indicatorId: string, measurementId: string): Promise<{
        value: import("@prisma/client-runtime-utils").Decimal;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        referenceDate: Date;
        indicatorId: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        source: string | null;
        notes: string | null;
    }>;
    syncIndicatorCache(indicatorId: string, indicator?: Awaited<ReturnType<typeof this.ensureIndicator>>): Promise<void>;
    private ensureIndicator;
    private ensureMeasurement;
    private validateDates;
    private isUniqueViolation;
}
