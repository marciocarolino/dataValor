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
exports.AnalysisController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const analysis_filter_dto_1 = require("./dto/analysis-filter.dto");
const create_analysis_dto_1 = require("./dto/create-analysis.dto");
const update_analysis_dto_1 = require("./dto/update-analysis.dto");
const analysis_entity_1 = require("./entities/analysis.entity");
const analysis_service_1 = require("./analysis.service");
const analysis_category_enum_1 = require("./enums/analysis-category.enum");
const execute_analysis_result_dto_1 = require("./dto/execute-analysis-result.dto");
let AnalysisController = class AnalysisController {
    analysisService;
    constructor(analysisService) {
        this.analysisService = analysisService;
    }
    async create(dto) {
        return this.analysisService.create(dto);
    }
    async findFavorites() {
        return this.analysisService.findFavorites();
    }
    async findPublic() {
        return this.analysisService.findPublic();
    }
    async getSummary() {
        return this.analysisService.getSummary();
    }
    async findByCategory(category) {
        return this.analysisService.findByCategory(category);
    }
    async findAll(query) {
        return this.analysisService.findAll(query);
    }
    async findOne(id) {
        return this.analysisService.findOne(id);
    }
    async update(id, dto) {
        return this.analysisService.update(id, dto);
    }
    async remove(id) {
        return this.analysisService.remove(id);
    }
    async execute(id) {
        return this.analysisService.execute(id);
    }
    async toggleFavorite(id) {
        return this.analysisService.toggleFavorite(id);
    }
};
exports.AnalysisController = AnalysisController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Criar análise',
        description: 'Cria uma nova configuração de análise de dados.',
    }),
    (0, swagger_1.ApiBody)({ type: create_analysis_dto_1.CreateAnalysisDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Análise criada.',
        type: analysis_entity_1.AnalysisEntity,
    }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_analysis_dto_1.CreateAnalysisDto]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('favorites'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Análises favoritas',
        description: 'Retorna todas as análises marcadas como favoritas.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de análises favoritas.',
        type: [analysis_entity_1.AnalysisEntity],
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findFavorites", null);
__decorate([
    (0, common_1.Get)('public'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Análises públicas',
        description: 'Retorna todas as análises compartilhadas publicamente.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de análises públicas.',
        type: [analysis_entity_1.AnalysisEntity],
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findPublic", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Resumo das análises',
        description: 'Retorna contagens e categorias existentes de análises.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resumo das análises.',
        schema: {
            example: {
                total: 10,
                favorites: 3,
                isPublic: 4,
                isPrivate: 6,
                categories: ['FINANCIAL', 'COMMERCIAL'],
            },
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar por categoria',
        description: 'Retorna análises de uma categoria específica.',
    }),
    (0, swagger_1.ApiParam)({ name: 'category', enum: analysis_category_enum_1.AnalysisCategory }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Análises da categoria.',
        type: [analysis_entity_1.AnalysisEntity],
    }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Categoria inválida.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findByCategory", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar análises',
        description: 'Retorna lista paginada com filtros, ordenação e busca textual.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiQuery)({ name: 'name', required: false, example: 'Receita' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false, enum: analysis_category_enum_1.AnalysisCategory }),
    (0, swagger_1.ApiQuery)({
        name: 'chartType',
        required: false,
        enum: ['LINE', 'BAR', 'AREA', 'PIE', 'DONUT', 'TABLE', 'KPI'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'isFavorite', required: false, example: true }),
    (0, swagger_1.ApiQuery)({ name: 'isPublic', required: false, example: false }),
    (0, swagger_1.ApiQuery)({ name: 'createdBy', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, example: '2026-01-01' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, example: '2026-12-31' }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        enum: ['name', 'category', 'chartType', 'createdAt', 'updatedAt'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista paginada de análises.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Parâmetros inválidos.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analysis_filter_dto_1.AnalysisFilterDto]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar análise por ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Análise encontrada.',
        type: analysis_entity_1.AnalysisEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Análise não encontrada.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'UUID inválido.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Atualizar análise',
        description: 'Atualiza campos da análise. Todos opcionais.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: update_analysis_dto_1.UpdateAnalysisDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Análise atualizada.',
        type: analysis_entity_1.AnalysisEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Análise não encontrada.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação ou UUID inválido.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_analysis_dto_1.UpdateAnalysisDto]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Excluir análise' }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Análise excluída.',
        type: analysis_entity_1.AnalysisEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Análise não encontrada.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'UUID inválido.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Executar análise',
        description: 'Executa a análise e retorna o payload padronizado para visualização no frontend. ' +
            'Contrato estável: quando integrado com Datasets/Indicators/AI Insights, ' +
            'apenas o método `buildSimulatedResult` no Service será substituído — ' +
            'sem necessidade de alterar o frontend.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resultado padronizado da execução da análise.',
        type: execute_analysis_result_dto_1.ExecuteAnalysisResultDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Análise não encontrada.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "execute", null);
__decorate([
    (0, common_1.Post)(':id/favorite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Alternar favorito',
        description: 'Marca ou remove a análise como favorita (toggle).',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Estado de favorito atualizado.',
        schema: { example: { id: 'uuid', name: 'Receita Q3', isFavorite: true } },
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Análise não encontrada.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "toggleFavorite", null);
exports.AnalysisController = AnalysisController = __decorate([
    (0, swagger_1.ApiTags)('Analysis'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('analysis'),
    __metadata("design:paramtypes", [analysis_service_1.AnalysisService])
], AnalysisController);
//# sourceMappingURL=analysis.controller.js.map