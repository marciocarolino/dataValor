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
exports.ListIndicatorsQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const indicator_category_enum_1 = require("../enums/indicator-category.enum");
const indicator_desired_direction_enum_1 = require("../enums/indicator-desired-direction.enum");
const indicator_status_enum_1 = require("../enums/indicator-status.enum");
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
class ListIndicatorsQueryDto {
    page = 1;
    limit = 20;
    category;
    status;
    desiredDirection;
    isActive;
    showOnDashboard;
    name;
    sortBy = 'createdAt';
    sortOrder = 'desc';
}
exports.ListIndicatorsQueryDto = ListIndicatorsQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toInt),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListIndicatorsQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20, minimum: 1, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toInt),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListIndicatorsQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: indicator_category_enum_1.IndicatorCategory,
        description: 'Filtrar por categoria.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(indicator_category_enum_1.IndicatorCategory),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: indicator_status_enum_1.IndicatorStatus,
        description: 'Filtrar por status.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(indicator_status_enum_1.IndicatorStatus),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: indicator_desired_direction_enum_1.IndicatorDesiredDirection,
        description: 'Filtrar por direção desejada do KPI.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(indicator_desired_direction_enum_1.IndicatorDesiredDirection),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "desiredDirection", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filtrar por indicadores ativos (true) ou inativos (false).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBool),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ListIndicatorsQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filtrar por indicadores marcados para exibição no Dashboard.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBool),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ListIndicatorsQueryDto.prototype, "showOnDashboard", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        maxLength: 120,
        description: 'Pesquisa por nome.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: 'createdAt',
        enum: ['name', 'category', 'status', 'createdAt', 'currentValue'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['name', 'category', 'status', 'createdAt', 'currentValue']),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'desc', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], ListIndicatorsQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=list-indicators-query.dto.js.map