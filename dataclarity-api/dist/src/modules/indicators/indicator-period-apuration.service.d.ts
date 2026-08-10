import { PrismaService } from '../../prisma/prisma.service';
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { AggregationType } from './enums/aggregation-type.enum';
export interface ApurationResultPeriodOpen {
    status: 'PERIOD_OPEN';
    indicatorId: string;
    periodStart: Date;
    periodEnd: Date;
    referenceDate: Date;
}
export interface ApurationResultAlreadyClosed {
    status: 'ALREADY_CLOSED';
    indicatorId: string;
    historyId: string;
    periodStart: Date;
    periodEnd: Date;
}
export interface ApurationResultFormulaRequired {
    status: 'FORMULA_ENGINE_REQUIRED';
    indicatorId: string;
    periodStart: Date;
    periodEnd: Date;
    formula: string | null;
}
export interface ApurationResultNoData {
    status: 'NO_DATA';
    indicatorId: string;
    periodStart: Date;
    periodEnd: Date;
    aggregationType: AggregationType;
}
export interface ApurationResultClosed {
    status: 'CLOSED';
    historyId: string;
    indicatorId: string;
    periodStart: Date;
    periodEnd: Date;
    value: number | null;
    previousValue: number | null;
    variationPercent: number | null;
    goalValue: number | null;
    indicatorStatus: IndicatorStatus;
    measurementCount: number;
    aggregationType: AggregationType;
    isActive: boolean;
}
export interface ApurationResultCustomFrequency {
    status: 'CUSTOM_FREQUENCY_NOT_SUPPORTED';
    indicatorId: string;
    message: string;
}
export type ApurationResult = ApurationResultPeriodOpen | ApurationResultAlreadyClosed | ApurationResultFormulaRequired | ApurationResultNoData | ApurationResultClosed | ApurationResultCustomFrequency;
export declare class IndicatorPeriodApurationService {
    private readonly prisma;
    private readonly periodResolver;
    private readonly periodClosing;
    private readonly aggregationEngine;
    private readonly historyService;
    private readonly analytics;
    constructor(prisma: PrismaService, periodResolver: PeriodResolverService, periodClosing: IndicatorPeriodClosingService, aggregationEngine: AggregationEngineService, historyService: IndicatorHistoryService, analytics: IndicatorAnalyticsService);
    closePeriod(indicatorId: string, referenceDate?: Date, timezone?: string): Promise<ApurationResult>;
    private computeVariation;
    private computeStatus;
    private decimalToNumber;
}
