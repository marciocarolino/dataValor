"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorsModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const indicators_controller_1 = require("./indicators.controller");
const indicators_service_1 = require("./indicators.service");
const indicator_analytics_service_1 = require("./indicator-analytics.service");
const indicator_cron_service_1 = require("./indicator-cron.service");
const indicator_history_controller_1 = require("./indicator-history.controller");
const indicator_history_service_1 = require("./indicator-history.service");
const measurements_service_1 = require("./measurements.service");
const measurements_controller_1 = require("./measurements.controller");
const period_resolver_service_1 = require("./period-resolver.service");
const indicator_period_closing_service_1 = require("./indicator-period-closing.service");
const aggregation_engine_service_1 = require("./aggregation-engine.service");
const indicator_period_apuration_service_1 = require("./indicator-period-apuration.service");
const indicator_period_backfill_service_1 = require("./indicator-period-backfill.service");
const indicator_period_closing_scheduler_1 = require("./indicator-period-closing.scheduler");
const indicator_current_state_service_1 = require("./indicator-current-state.service");
const indicator_state_reconciliation_service_1 = require("./indicator-state-reconciliation.service");
const formula_tokenizer_service_1 = require("./formula/formula-tokenizer.service");
const formula_parser_service_1 = require("./formula/formula-parser.service");
const formula_validator_service_1 = require("./formula/formula-validator.service");
const formula_evaluator_service_1 = require("./formula/formula-evaluator.service");
const formula_engine_service_1 = require("./formula/formula-engine.service");
let IndicatorsModule = class IndicatorsModule {
};
exports.IndicatorsModule = IndicatorsModule;
exports.IndicatorsModule = IndicatorsModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule.forRoot()],
        controllers: [
            indicators_controller_1.IndicatorsController,
            measurements_controller_1.MeasurementsController,
            indicator_history_controller_1.IndicatorHistoryController,
        ],
        providers: [
            indicators_service_1.IndicatorsService,
            indicator_analytics_service_1.IndicatorAnalyticsService,
            indicator_cron_service_1.IndicatorCronService,
            measurements_service_1.MeasurementsService,
            indicator_history_service_1.IndicatorHistoryService,
            period_resolver_service_1.PeriodResolverService,
            indicator_period_closing_service_1.IndicatorPeriodClosingService,
            formula_tokenizer_service_1.FormulaTokenizerService,
            formula_parser_service_1.FormulaParserService,
            formula_validator_service_1.FormulaValidatorService,
            formula_evaluator_service_1.FormulaEvaluatorService,
            formula_engine_service_1.FormulaEngineService,
            aggregation_engine_service_1.AggregationEngineService,
            indicator_current_state_service_1.IndicatorCurrentStateService,
            indicator_state_reconciliation_service_1.IndicatorStateReconciliationService,
            indicator_period_apuration_service_1.IndicatorPeriodApurationService,
            indicator_period_backfill_service_1.IndicatorPeriodBackfillService,
            indicator_period_closing_scheduler_1.IndicatorPeriodClosingScheduler,
        ],
        exports: [
            indicators_service_1.IndicatorsService,
            indicator_analytics_service_1.IndicatorAnalyticsService,
            measurements_service_1.MeasurementsService,
            indicator_history_service_1.IndicatorHistoryService,
            period_resolver_service_1.PeriodResolverService,
            indicator_period_closing_service_1.IndicatorPeriodClosingService,
            formula_engine_service_1.FormulaEngineService,
            aggregation_engine_service_1.AggregationEngineService,
            indicator_period_apuration_service_1.IndicatorPeriodApurationService,
        ],
    })
], IndicatorsModule);
//# sourceMappingURL=indicators.module.js.map