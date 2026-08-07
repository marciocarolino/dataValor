import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorCronService } from './indicator-cron.service';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [IndicatorsController, MeasurementsController],
  providers: [
    IndicatorsService,
    IndicatorAnalyticsService,
    IndicatorCronService,
    MeasurementsService,
  ],
  exports: [IndicatorsService, IndicatorAnalyticsService, MeasurementsService],
})
export class IndicatorsModule {}
