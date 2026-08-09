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
  ],
  exports: [
    IndicatorsService,
    IndicatorAnalyticsService,
    MeasurementsService,
    IndicatorHistoryService,
    PeriodResolverService,
    IndicatorPeriodClosingService,
  ],
})
export class IndicatorsModule {}
