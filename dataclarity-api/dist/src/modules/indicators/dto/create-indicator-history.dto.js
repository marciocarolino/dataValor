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
exports.CreateIndicatorHistoryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const indicator_status_enum_1 = require("../enums/indicator-status.enum");
let PeriodEndAfterStartConstraint = class PeriodEndAfterStartConstraint {
    validate(periodEnd, args) {
        const obj = args.object;
        if (!obj.periodStart || !periodEnd)
            return true;
        return new Date(periodEnd) >= new Date(obj.periodStart);
    }
    defaultMessage() {
        return 'periodEnd não pode ser anterior a periodStart.';
    }
};
PeriodEndAfterStartConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'PeriodEndAfterStart', async: false })
], PeriodEndAfterStartConstraint);
class CreateIndicatorHistoryDto {
    periodStart;
    periodEnd;
    value;
    goalValue;
    previousValue;
    variationPercent;
    status;
    notes;
}
exports.CreateIndicatorHistoryDto = CreateIndicatorHistoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: String,
        format: 'date-time',
        example: '2026-08-01T00:00:00.000Z',
        description: 'Início do período do resultado (obrigatório).',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateIndicatorHistoryDto.prototype, "periodStart", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: String,
        format: 'date-time',
        example: '2026-08-31T23:59:59.000Z',
        description: 'Fim do período do resultado. Deve ser >= periodStart.',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Validate)(PeriodEndAfterStartConstraint),
    __metadata("design:type", String)
], CreateIndicatorHistoryDto.prototype, "periodEnd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 1500.0,
        description: 'Valor realizado no período.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateIndicatorHistoryDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 1400.0,
        description: 'Meta do período.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateIndicatorHistoryDto.prototype, "goalValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 1344.0,
        description: 'Valor do período anterior (para cálculo de variação).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateIndicatorHistoryDto.prototype, "previousValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 11.61,
        description: 'Variação percentual em relação ao período anterior.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    __metadata("design:type", Number)
], CreateIndicatorHistoryDto.prototype, "variationPercent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: indicator_status_enum_1.IndicatorStatus,
        example: indicator_status_enum_1.IndicatorStatus.SUCCESS,
        description: 'Status do resultado do período: SUCCESS, WARNING, DANGER ou NEUTRAL.',
    }),
    (0, class_validator_1.IsEnum)(indicator_status_enum_1.IndicatorStatus),
    __metadata("design:type", String)
], CreateIndicatorHistoryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Resultado final após ajuste de estorno.',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateIndicatorHistoryDto.prototype, "notes", void 0);
//# sourceMappingURL=create-indicator-history.dto.js.map