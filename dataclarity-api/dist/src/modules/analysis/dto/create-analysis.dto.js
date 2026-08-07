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
exports.CreateAnalysisDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const analysis_aggregation_enum_1 = require("../enums/analysis-aggregation.enum");
const analysis_category_enum_1 = require("../enums/analysis-category.enum");
const analysis_chart_type_enum_1 = require("../enums/analysis-chart-type.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;
class CreateAnalysisDto {
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
}
exports.CreateAnalysisDto = CreateAnalysisDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Receita por Categoria Q3',
        minLength: 2,
        maxLength: 150,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Análise de receita agrupada por categoria',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_chart_type_enum_1.AnalysisChartType, example: analysis_chart_type_enum_1.AnalysisChartType.BAR }),
    (0, class_validator_1.IsEnum)(analysis_chart_type_enum_1.AnalysisChartType),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_category_enum_1.AnalysisCategory, example: analysis_category_enum_1.AnalysisCategory.FINANCIAL }),
    (0, class_validator_1.IsEnum)(analysis_category_enum_1.AnalysisCategory),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'sales', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "dataset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'revenue', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "metric", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: analysis_aggregation_enum_1.AnalysisAggregation, example: analysis_aggregation_enum_1.AnalysisAggregation.SUM }),
    (0, class_validator_1.IsEnum)(analysis_aggregation_enum_1.AnalysisAggregation),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "aggregation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'category', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "groupBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'createdAt', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "dateField", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-01-01T00:00:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateAnalysisDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-12-31T23:59:59Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateAnalysisDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '{"status":"active","region":"BR"}',
        description: 'Filtros adicionais em formato JSON string.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsJSON)(),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "filters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false, default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAnalysisDto.prototype, "isFavorite", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false, default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAnalysisDto.prototype, "isPublic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        format: 'uuid',
        description: 'UUID do usuário criador.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], CreateAnalysisDto.prototype, "createdBy", void 0);
//# sourceMappingURL=create-analysis.dto.js.map