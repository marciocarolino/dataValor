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
exports.IndicatorEntity = void 0;
const swagger_1 = require("@nestjs/swagger");
const indicator_category_enum_1 = require("../enums/indicator-category.enum");
const indicator_chart_type_enum_1 = require("../enums/indicator-chart-type.enum");
const indicator_period_enum_1 = require("../enums/indicator-period.enum");
const indicator_status_enum_1 = require("../enums/indicator-status.enum");
class IndicatorEntity {
    id;
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
    daysRemaining;
    isActive;
    showOnDashboard;
    createdAt;
    updatedAt;
}
exports.IndicatorEntity = IndicatorEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], IndicatorEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Receita Total' }),
    __metadata("design:type", String)
], IndicatorEntity.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Receita bruta acumulada no mês',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: indicator_category_enum_1.IndicatorCategory,
        example: indicator_category_enum_1.IndicatorCategory.FINANCIAL,
    }),
    __metadata("design:type", String)
], IndicatorEntity.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'SUM(receitas) - SUM(devoluções)',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "formula", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BRL', nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3000000, nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "goalValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2400000, nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "currentValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2100000, nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "previousValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: indicator_period_enum_1.IndicatorPeriod,
        example: indicator_period_enum_1.IndicatorPeriod.PREVIOUS_MONTH,
        nullable: true,
        description: 'Período de referência do valor anterior.',
    }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "previousPeriod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 14.28, nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "variation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: indicator_status_enum_1.IndicatorStatus, example: indicator_status_enum_1.IndicatorStatus.SUCCESS }),
    __metadata("design:type", String)
], IndicatorEntity.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '#4c6ef5', nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'trending_up', nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: indicator_chart_type_enum_1.IndicatorChartType, example: indicator_chart_type_enum_1.IndicatorChartType.LINE }),
    __metadata("design:type", String)
], IndicatorEntity.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date-time', nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date-time', nullable: true }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: Number,
        nullable: true,
        description: 'Dias restantes até o prazo (calculado automaticamente pelo cron). Negativo = prazo encerrado.',
    }),
    __metadata("design:type", Object)
], IndicatorEntity.prototype, "daysRemaining", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], IndicatorEntity.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], IndicatorEntity.prototype, "showOnDashboard", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], IndicatorEntity.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], IndicatorEntity.prototype, "updatedAt", void 0);
//# sourceMappingURL=indicator.entity.js.map