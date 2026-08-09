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
exports.IndicatorHistoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_indicator_history_dto_1 = require("./dto/create-indicator-history.dto");
const indicator_history_entity_1 = require("./entities/indicator-history.entity");
const indicator_history_service_1 = require("./indicator-history.service");
const uuidPipe = new common_1.ParseUUIDPipe({
    version: '4',
    errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
});
let IndicatorHistoryController = class IndicatorHistoryController {
    historyService;
    constructor(historyService) {
        this.historyService = historyService;
    }
    async create(indicatorId, dto) {
        return this.historyService.create(indicatorId, dto);
    }
    async findAll(indicatorId, page, limit, startDate, endDate) {
        return this.historyService.findAll(indicatorId, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            startDate,
            endDate,
        });
    }
    async findOne(indicatorId, id) {
        return this.historyService.findOne(indicatorId, id);
    }
    async remove(indicatorId, id) {
        return this.historyService.remove(indicatorId, id);
    }
};
exports.IndicatorHistoryController = IndicatorHistoryController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar resultado histórico',
        description: 'Cria um resultado consolidado para o período informado. ' +
            'Não pode existir dois resultados para o mesmo indicador no exato mesmo período.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: create_indicator_history_dto_1.CreateIndicatorHistoryDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Resultado histórico criado.',
        type: indicator_history_entity_1.IndicatorHistoryEntity,
    }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'Já existe um resultado para este período neste indicador.',
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_indicator_history_dto_1.CreateIndicatorHistoryDto]),
    __metadata("design:returntype", Promise)
], IndicatorHistoryController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar histórico de resultados',
        description: 'Retorna os resultados históricos do indicador ordenados por periodStart decrescente. ' +
            'Suporta paginação e filtro de período.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        example: '2026-01-01',
        description: 'Filtrar resultados com periodStart >= esta data.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        example: '2026-12-31',
        description: 'Filtrar resultados com periodStart <= esta data.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista paginada de resultados históricos.',
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], IndicatorHistoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Detalhar resultado histórico por ID' }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resultado histórico encontrado.',
        type: indicator_history_entity_1.IndicatorHistoryEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Resultado histórico não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Param)('id', uuidPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndicatorHistoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Remover resultado histórico',
        description: 'Remove um resultado histórico específico do indicador.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resultado histórico removido.',
        type: indicator_history_entity_1.IndicatorHistoryEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Resultado histórico não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Param)('id', uuidPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IndicatorHistoryController.prototype, "remove", null);
exports.IndicatorHistoryController = IndicatorHistoryController = __decorate([
    (0, swagger_1.ApiTags)('Indicator History'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('indicators/:indicatorId/history'),
    __metadata("design:paramtypes", [indicator_history_service_1.IndicatorHistoryService])
], IndicatorHistoryController);
//# sourceMappingURL=indicator-history.controller.js.map