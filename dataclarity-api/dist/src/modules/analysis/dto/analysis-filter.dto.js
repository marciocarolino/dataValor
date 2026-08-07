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
exports.AnalysisFilterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const analysis_category_enum_1 = require("../enums/analysis-category.enum");
const analysis_chart_type_enum_1 = require("../enums/analysis-chart-type.enum");
const toInt = ({ value }) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
};
const toBool = ({ value }) => {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return value;
};
const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;
class AnalysisFilterDto {
    page = 1;
    limit = 20;
    name;
    category;
    chartType;
    isFavorite;
    isPublic;
    createdBy;
    startDate;
    endDate;
    sortBy = 'createdAt';
    sortOrder = 'desc';
}
exports.AnalysisFilterDto = AnalysisFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toInt),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AnalysisFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20, minimum: 1, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toInt),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], AnalysisFilterDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        maxLength: 150,
        description: 'Busca textual por nome.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: analysis_category_enum_1.AnalysisCategory,
        description: 'Filtrar por categoria.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analysis_category_enum_1.AnalysisCategory),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: analysis_chart_type_enum_1.AnalysisChartType,
        description: 'Filtrar por tipo de gráfico.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analysis_chart_type_enum_1.AnalysisChartType),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filtrar favoritas.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBool),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AnalysisFilterDto.prototype, "isFavorite", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filtrar análises públicas.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBool),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AnalysisFilterDto.prototype, "isPublic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid', description: 'Filtrar por criador.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        description: 'Criadas a partir desta data.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        description: 'Criadas até esta data.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: 'createdAt',
        enum: ['name', 'category', 'chartType', 'createdAt', 'updatedAt'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['name', 'category', 'chartType', 'createdAt', 'updatedAt']),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'desc', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], AnalysisFilterDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=analysis-filter.dto.js.map