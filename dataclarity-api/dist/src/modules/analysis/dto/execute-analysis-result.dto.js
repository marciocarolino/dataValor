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
exports.ExecuteAnalysisResultDto = exports.ExecuteSummaryDto = exports.ExecuteDatasetDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ExecuteDatasetDto {
    label;
    data;
}
exports.ExecuteDatasetDto = ExecuteDatasetDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Receita',
        description: 'Nome/label da série de dados.',
    }),
    __metadata("design:type", String)
], ExecuteDatasetDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [Number],
        example: [120000, 150000, 170000],
        description: 'Valores numéricos da série, na mesma ordem dos labels.',
    }),
    __metadata("design:type", Array)
], ExecuteDatasetDto.prototype, "data", void 0);
class ExecuteSummaryDto {
    total;
    growth;
    records;
}
exports.ExecuteSummaryDto = ExecuteSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 440000, description: 'Soma total dos valores.' }),
    __metadata("design:type", Number)
], ExecuteSummaryDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 13.2,
        nullable: true,
        description: 'Percentual de crescimento em relação ao período anterior.',
    }),
    __metadata("design:type", Object)
], ExecuteSummaryDto.prototype, "growth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 3,
        description: 'Quantidade de registros retornados.',
    }),
    __metadata("design:type", Number)
], ExecuteSummaryDto.prototype, "records", void 0);
class ExecuteAnalysisResultDto {
    title;
    description;
    chartType;
    labels;
    datasets;
    summary;
}
exports.ExecuteAnalysisResultDto = ExecuteAnalysisResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Receita Mensal',
        description: 'Título da análise executada.',
    }),
    __metadata("design:type", String)
], ExecuteAnalysisResultDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Receita por mês',
        nullable: true,
        description: 'Descrição da análise.',
    }),
    __metadata("design:type", Object)
], ExecuteAnalysisResultDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'LINE',
        description: 'Tipo de gráfico — define como o frontend deve renderizar os dados.',
    }),
    __metadata("design:type", String)
], ExecuteAnalysisResultDto.prototype, "chartType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [String],
        example: ['Jan', 'Fev', 'Mar'],
        description: 'Eixo X ou categorias da visualização.',
    }),
    __metadata("design:type", Array)
], ExecuteAnalysisResultDto.prototype, "labels", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [ExecuteDatasetDto],
        description: 'Séries de dados para o gráfico.',
    }),
    __metadata("design:type", Array)
], ExecuteAnalysisResultDto.prototype, "datasets", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: ExecuteSummaryDto,
        description: 'Resumo estatístico da execução.',
    }),
    __metadata("design:type", ExecuteSummaryDto)
], ExecuteAnalysisResultDto.prototype, "summary", void 0);
//# sourceMappingURL=execute-analysis-result.dto.js.map