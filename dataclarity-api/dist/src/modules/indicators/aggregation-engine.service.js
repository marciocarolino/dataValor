"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationEngineService = void 0;
exports.isFormulaResult = isFormulaResult;
const common_1 = require("@nestjs/common");
const aggregation_type_enum_1 = require("./enums/aggregation-type.enum");
const formula_engine_service_1 = require("./formula/formula-engine.service");
function isFormulaResult(r) {
    return (r.aggregationType === aggregation_type_enum_1.AggregationType.FORMULA &&
        'requiresFormulaEngine' in r &&
        r.requiresFormulaEngine === true);
}
let AggregationEngineService = class AggregationEngineService {
    formulaEngine;
    constructor(formulaEngine) {
        this.formulaEngine = formulaEngine;
    }
    aggregate(indicator, periodStart, periodEnd, measurements) {
        if (indicator.aggregationType === aggregation_type_enum_1.AggregationType.FORMULA) {
            const valid = this.filterAndConvert(measurements, periodStart, periodEnd);
            if (this.formulaEngine && indicator.formula) {
                const result = this.formulaEngine.evaluateWithMeasurements(indicator.formula, valid);
                return {
                    aggregationType: aggregation_type_enum_1.AggregationType.FORMULA,
                    value: result.value,
                    measurementCount: valid.length,
                    periodStart,
                    periodEnd,
                };
            }
            return {
                aggregationType: aggregation_type_enum_1.AggregationType.FORMULA,
                value: null,
                measurementCount: valid.length,
                periodStart,
                periodEnd,
                requiresFormulaEngine: true,
                formula: indicator.formula ?? null,
            };
        }
        const valid = this.filterAndConvert(measurements, periodStart, periodEnd);
        const value = this.compute(indicator.aggregationType, valid);
        return {
            aggregationType: indicator.aggregationType,
            value,
            measurementCount: valid.length,
            periodStart,
            periodEnd,
        };
    }
    filterAndConvert(measurements, periodStart, periodEnd) {
        const startMs = periodStart.getTime();
        const endMs = periodEnd.getTime();
        const result = [];
        for (const m of measurements) {
            const refMs = m.referenceDate.getTime();
            if (refMs < startMs || refMs >= endMs)
                continue;
            const num = this.toNumber(m.value);
            if (num === null)
                continue;
            result.push({ value: num, referenceDate: m.referenceDate });
        }
        return result;
    }
    compute(aggregationType, valid) {
        if (valid.length === 0) {
            return aggregationType === aggregation_type_enum_1.AggregationType.COUNT ? 0 : null;
        }
        switch (aggregationType) {
            case aggregation_type_enum_1.AggregationType.SUM:
                return valid.reduce((acc, m) => acc + m.value, 0);
            case aggregation_type_enum_1.AggregationType.AVG: {
                const sum = valid.reduce((acc, m) => acc + m.value, 0);
                return sum / valid.length;
            }
            case aggregation_type_enum_1.AggregationType.MIN:
                return Math.min(...valid.map((m) => m.value));
            case aggregation_type_enum_1.AggregationType.MAX:
                return Math.max(...valid.map((m) => m.value));
            case aggregation_type_enum_1.AggregationType.LAST: {
                const sorted = [...valid].sort((a, b) => {
                    const diff = b.referenceDate.getTime() - a.referenceDate.getTime();
                    if (diff !== 0)
                        return diff;
                    return a.value - b.value;
                });
                return sorted[0].value;
            }
            case aggregation_type_enum_1.AggregationType.COUNT:
                return valid.length;
            default: {
                const _exhaustive = aggregationType;
                throw new Error(`AggregationType não suportado: ${String(_exhaustive)}`);
            }
        }
    }
    toNumber(d) {
        if (d == null)
            return null;
        const n = typeof d === 'object' && d !== null && 'toNumber' in d
            ? d.toNumber()
            : Number(d);
        if (!isFinite(n) || isNaN(n))
            return null;
        return n;
    }
};
exports.AggregationEngineService = AggregationEngineService;
exports.AggregationEngineService = AggregationEngineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [formula_engine_service_1.FormulaEngineService])
], AggregationEngineService);
//# sourceMappingURL=aggregation-engine.service.js.map