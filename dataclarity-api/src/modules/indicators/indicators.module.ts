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
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
import { IndicatorPeriodClosingScheduler } from './indicator-period-closing.scheduler';
// Formula Engine
import { FormulaTokenizerService } from './formula/formula-tokenizer.service';
import { FormulaParserService } from './formula/formula-parser.service';
import { FormulaValidatorService } from './formula/formula-validator.service';
import { FormulaEvaluatorService } from './formula/formula-evaluator.service';
import { FormulaEngineService } from './formula/formula-engine.service';

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
    // Formula Engine (ordem de dependência: tokenizer → parser → validator → evaluator → engine)
    FormulaTokenizerService,
    FormulaParserService,
    FormulaValidatorService,
    FormulaEvaluatorService,
    FormulaEngineService,
    AggregationEngineService,
    IndicatorPeriodApurationService,
    IndicatorPeriodBackfillService,
    IndicatorPeriodClosingScheduler,
  ],
  exports: [
    IndicatorsService,
    IndicatorAnalyticsService,
    MeasurementsService,
    IndicatorHistoryService,
    PeriodResolverService,
    IndicatorPeriodClosingService,
    FormulaEngineService,
    AggregationEngineService,
    IndicatorPeriodApurationService,
  ],
})
export class IndicatorsModule {}
