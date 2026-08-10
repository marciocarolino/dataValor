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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaEngineService = void 0;
const common_1 = require("@nestjs/common");
const formula_parser_service_1 = require("./formula-parser.service");
const formula_validator_service_1 = require("./formula-validator.service");
const formula_evaluator_service_1 = require("./formula-evaluator.service");
const formula_errors_1 = require("./formula.errors");
const formula_types_1 = require("./formula.types");
let FormulaEngineService = class FormulaEngineService {
    parser;
    validator;
    evaluator;
    constructor(parser, validator, evaluator) {
        this.parser = parser;
        this.validator = validator;
        this.evaluator = evaluator;
    }
    evaluate(formula, context) {
        if (!formula || formula.trim().length === 0) {
            throw new formula_errors_1.FormulaSyntaxError('Fórmula não pode ser vazia.', formula);
        }
        if (formula.length > formula_types_1.FORMULA_LIMITS.MAX_FORMULA_LENGTH) {
            throw new formula_errors_1.FormulaSyntaxError(`Fórmula excede o comprimento máximo de ${formula_types_1.FORMULA_LIMITS.MAX_FORMULA_LENGTH} caracteres ` +
                `(atual: ${formula.length}).`, formula);
        }
        const ast = this.parser.parse(formula);
        this.validator.validate(ast, formula);
        const value = this.evaluator.evaluate(ast, context, formula);
        return { value, formula };
    }
    buildContext(measurements) {
        if (measurements.length === 0) {
            return {
                aggregates: {
                    SUM: null,
                    AVG: null,
                    MIN: null,
                    MAX: null,
                    LAST: null,
                    COUNT: 0,
                },
            };
        }
        const values = measurements.map((m) => m.value);
        const count = values.length;
        const sum = values.reduce((acc, v) => acc + v, 0);
        const avg = sum / count;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sorted = [...measurements].sort((a, b) => {
            const diff = b.referenceDate.getTime() - a.referenceDate.getTime();
            if (diff !== 0)
                return diff;
            return a.value - b.value;
        });
        const last = sorted[0].value;
        return {
            aggregates: {
                SUM: sum,
                AVG: avg,
                MIN: min,
                MAX: max,
                LAST: last,
                COUNT: count,
            },
        };
    }
    buildContextFromFiltered(filtered) {
        return this.buildContext(filtered);
    }
    evaluateWithMeasurements(formula, filtered) {
        const context = this.buildContextFromFiltered(filtered);
        return this.evaluate(formula, context);
    }
};
exports.FormulaEngineService = FormulaEngineService;
exports.FormulaEngineService = FormulaEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [formula_parser_service_1.FormulaParserService,
        formula_validator_service_1.FormulaValidatorService,
        formula_evaluator_service_1.FormulaEvaluatorService])
], FormulaEngineService);
//# sourceMappingURL=formula-engine.service.js.map