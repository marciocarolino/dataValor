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
exports.IndicatorsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_indicator_dto_1 = require("./dto/create-indicator.dto");
const list_indicators_query_dto_1 = require("./dto/list-indicators-query.dto");
const update_indicator_dto_1 = require("./dto/update-indicator.dto");
const indicator_entity_1 = require("./entities/indicator.entity");
const indicators_service_1 = require("./indicators.service");
const indicator_category_enum_1 = require("./enums/indicator-category.enum");
let IndicatorsController = class IndicatorsController {
    indicatorsService;
    constructor(indicatorsService) {
        this.indicatorsService = indicatorsService;
    }
    async create(dto) {
        return this.indicatorsService.create(dto);
    }
    async findDashboard() {
        return this.indicatorsService.findDashboard();
    }
    async getDashboardSummary() {
        return this.indicatorsService.getDashboardSummary();
    }
    async getSummary() {
        return this.indicatorsService.getSummary();
    }
    async findByCategory(category) {
        return this.indicatorsService.findByCategory(category);
    }
    async findAll(query) {
        return this.indicatorsService.findAll(query);
    }
    async findOne(id) {
        return this.indicatorsService.findOne(id);
    }
    async update(id, dto) {
        return this.indicatorsService.update(id, dto);
    }
    async remove(id) {
        return this.indicatorsService.remove(id);
    }
};
exports.IndicatorsController = IndicatorsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Criar indicador',
        description: 'Cria um novo indicador de negócio (KPI).',
    }),
    (0, swagger_1.ApiBody)({ type: create_indicator_dto_1.CreateIndicatorDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Indicador criado.',
        type: indicator_entity_1.IndicatorEntity,
    }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_indicator_dto_1.CreateIndicatorDto]),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Indicadores do Dashboard',
        description: 'Retorna apenas os indicadores marcados para exibição no Dashboard principal.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de indicadores do dashboard.',
        type: [indicator_entity_1.IndicatorEntity],
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "findDashboard", null);
__decorate([
    (0, common_1.Get)('dashboard/summary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Dashboard summary',
        description: 'Retorna totais de indicadores por status, ativo/inativo e número de categorias.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Summary do dashboard.',
        schema: {
            example: {
                total: 10,
                active: 8,
                inactive: 2,
                categories: 4,
                byStatus: { SUCCESS: 4, WARNING: 2, DANGER: 1, NEUTRAL: 3 },
            },
        },
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Resumo dos indicadores (legado)',
        description: 'Mantido por compatibilidade. Use /indicators/dashboard/summary.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Resumo dos indicadores.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar por categoria',
        description: 'Retorna indicadores ativos de uma categoria específica.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'category',
        enum: indicator_category_enum_1.IndicatorCategory,
        description: 'Categoria do indicador.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Indicadores da categoria.',
        type: [indicator_entity_1.IndicatorEntity],
    }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Categoria inválida.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "findByCategory", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar indicadores',
        description: 'Retorna lista paginada de indicadores com filtros opcionais.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        required: false,
        enum: indicator_category_enum_1.IndicatorCategory,
        description: 'Filtrar por categoria.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: ['SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL', 'INACTIVE'],
        description: 'Filtrar por status.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'isActive',
        required: false,
        example: true,
        description: 'Filtrar por ativo/inativo.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'name',
        required: false,
        example: 'Receita',
        description: 'Buscar por nome.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        enum: ['name', 'category', 'status', 'createdAt', 'currentValue'],
    }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista paginada de indicadores.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Parâmetros inválidos.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_indicators_query_dto_1.ListIndicatorsQueryDto]),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar indicador por ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do indicador.', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Indicador encontrado.',
        type: indicator_entity_1.IndicatorEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
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
], IndicatorsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Atualizar indicador',
        description: 'Atualiza campos do indicador. Todos os campos são opcionais.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do indicador.', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: update_indicator_dto_1.UpdateIndicatorDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Indicador atualizado.',
        type: indicator_entity_1.IndicatorEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação ou UUID inválido.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_indicator_dto_1.UpdateIndicatorDto]),
    __metadata("design:returntype", Promise)
], IndicatorsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Excluir indicador' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do indicador.', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Indicador excluído.',
        type: indicator_entity_1.IndicatorEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
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
], IndicatorsController.prototype, "remove", null);
exports.IndicatorsController = IndicatorsController = __decorate([
    (0, swagger_1.ApiTags)('Indicators'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('indicators'),
    __metadata("design:paramtypes", [indicators_service_1.IndicatorsService])
], IndicatorsController);
//# sourceMappingURL=indicators.controller.js.map