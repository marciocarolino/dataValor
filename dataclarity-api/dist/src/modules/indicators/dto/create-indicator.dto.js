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
exports.CreateIndicatorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const indicator_category_enum_1 = require("../enums/indicator-category.enum");
const indicator_chart_type_enum_1 = require("../enums/indicator-chart-type.enum");
const indicator_period_enum_1 = require("../enums/indicator-period.enum");
const indicator_status_enum_1 = require("../enums/indicator-status.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;
class CreateIndicatorDto {
    name;
    description;
    category;
    formula;
    unit;
    goalValue;
    currentValue;
    previousValue;
    previousPeriod;
    variation;
    status;
    color;
    icon;
    chartType;
    startDate;
    endDate;
    isActive;
    showOnDashboard;
}
exports.CreateIndicatorDto = CreateIndicatorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Receita Total', minLength: 2, maxLength: 120 }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Receita bruta acumulada no mês',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: indicator_category_enum_1.IndicatorCategory,
        example: indicator_category_enum_1.IndicatorCategory.FINANCIAL,
    }),
    (0, class_validator_1.IsEnum)(indicator_category_enum_1.IndicatorCategory),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'SUM(receitas) - SUM(devoluções)',
        maxLength: 300,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "formula", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BRL', maxLength: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3000000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateIndicatorDto.prototype, "goalValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2400000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateIndicatorDto.prototype, "currentValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2100000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateIndicatorDto.prototype, "previousValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: indicator_period_enum_1.IndicatorPeriod,
        example: indicator_period_enum_1.IndicatorPeriod.PREVIOUS_MONTH,
        description: 'Indica o período de referência do valor anterior: mês anterior, trimestre anterior, semestre anterior, ano anterior ou personalizado.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(indicator_period_enum_1.IndicatorPeriod),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "previousPeriod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 14.28 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateIndicatorDto.prototype, "variation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: indicator_status_enum_1.IndicatorStatus, example: indicator_status_enum_1.IndicatorStatus.NEUTRAL }),
    (0, class_validator_1.IsEnum)(indicator_status_enum_1.IndicatorStatus),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '#4c6ef5', maxLength: 30, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", Object)
], CreateIndicatorDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'trending_up',
        maxLength: 60,
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", Object)
], CreateIndicatorDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: indicator_chart_type_enum_1.IndicatorChartType, example: indicator_chart_type_enum_1.IndicatorChartType.NUMBER }),
    (0, class_validator_1.IsEnum)(indicator_chart_type_enum_1.IndicatorChartType),
    __metadata("design:type", String)
], CreateIndicatorDto.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-01-01T00:00:00.000Z',
        description: 'Data de início do período de acompanhamento do indicador.',
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)({ strict: false }),
    __metadata("design:type", Object)
], CreateIndicatorDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-12-31T23:59:59.000Z',
        description: 'Data de término do período de acompanhamento do indicador (prazo para bater a meta).',
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)({ strict: false }),
    __metadata("design:type", Object)
], CreateIndicatorDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateIndicatorDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: false,
        default: false,
        description: 'Exibir no Dashboard principal.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateIndicatorDto.prototype, "showOnDashboard", void 0);
//# sourceMappingURL=create-indicator.dto.js.map