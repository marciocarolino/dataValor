import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorCronService } from './indicator-cron.service';
import { IndicatorHistoryController } from './indicator-history.controller';
import { IndicatorHistoryService } from './indicator-history.service';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodClosingScheduler } from './indicator-period-closing.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [
    IndicatorsController,
    MeasurementsController,
    IndicatorHistoryController,
  ],
  providers: [
    IndicatorsService,
    IndicatorAnalyticsService,
    IndicatorCronService,
    MeasurementsService,
    IndicatorHistoryService,
    PeriodResolverService,
    IndicatorPeriodClosingService,
    AggregationEngineService,
    IndicatorPeriodApurationService,
    IndicatorPeriodClosingScheduler,
  ],
  exports: [
    IndicatorsService,
    IndicatorAnalyticsService,
    MeasurementsService,
    IndicatorHistoryService,
    PeriodResolverService,
    IndicatorPeriodClosingService,
    AggregationEngineService,
    IndicatorPeriodApurationService,
  ],
})
export class IndicatorsModule {}
