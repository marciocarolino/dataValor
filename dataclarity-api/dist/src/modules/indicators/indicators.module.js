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
const measurements_service_1 = require("./measurements.service");
const measurements_controller_1 = require("./measurements.controller");
let IndicatorsModule = class IndicatorsModule {
};
exports.IndicatorsModule = IndicatorsModule;
exports.IndicatorsModule = IndicatorsModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule.forRoot()],
        controllers: [indicators_controller_1.IndicatorsController, measurements_controller_1.MeasurementsController],
        providers: [
            indicators_service_1.IndicatorsService,
            indicator_analytics_service_1.IndicatorAnalyticsService,
            indicator_cron_service_1.IndicatorCronService,
            measurements_service_1.MeasurementsService,
        ],
        exports: [indicators_service_1.IndicatorsService, indicator_analytics_service_1.IndicatorAnalyticsService, measurements_service_1.MeasurementsService],
    })
], IndicatorsModule);
//# sourceMappingURL=indicators.module.js.map