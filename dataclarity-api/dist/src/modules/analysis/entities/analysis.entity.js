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
exports.AnalysisEntity = void 0;
const swagger_1 = require("@nestjs/swagger");
const analysis_aggregation_enum_1 = require("../enums/analysis-aggregation.enum");
const analysis_category_enum_1 = require("../enums/analysis-category.enum");
const analysis_chart_type_enum_1 = require("../enums/analysis-chart-type.enum");
class AnalysisEntity {
    id;
    name;
    description;
    chartType;
    category;
    dataset;
    metric;
    aggregation;
    groupBy;
    dateField;
    startDate;
    endDate;
    filters;
    isFavorite;
    isPublic;
    createdBy;
    createdAt;
    updatedAt;
}
exports.AnalysisEntity = AnalysisEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Receita por Categoria Q3' }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Análise de receita agrupada por categoria no Q3',
        nullable: true,
    }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_chart_type_enum_1.AnalysisChartType, example: analysis_chart_type_enum_1.AnalysisChartType.BAR }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_category_enum_1.AnalysisCategory, example: analysis_category_enum_1.AnalysisCategory.FINANCIAL }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'sales', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "dataset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'revenue', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "metric", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_aggregation_enum_1.AnalysisAggregation, example: analysis_aggregation_enum_1.AnalysisAggregation.SUM }),
    __metadata("design:type", String)
], AnalysisEntity.prototype, "aggregation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'category', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "groupBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'createdAt', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "dateField", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date-time', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date-time', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: { status: 'active', region: 'BR' },
        nullable: true,
        description: 'Filtros adicionais em formato JSON.',
    }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "filters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], AnalysisEntity.prototype, "isFavorite", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], AnalysisEntity.prototype, "isPublic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AnalysisEntity.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], AnalysisEntity.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], AnalysisEntity.prototype, "updatedAt", void 0);
//# sourceMappingURL=analysis.entity.js.map