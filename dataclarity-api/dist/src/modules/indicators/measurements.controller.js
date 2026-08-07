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
exports.MeasurementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_measurement_dto_1 = require("./dto/create-measurement.dto");
const update_measurement_dto_1 = require("./dto/update-measurement.dto");
const measurements_service_1 = require("./measurements.service");
const indicators_service_1 = require("./indicators.service");
const uuidPipe = new common_1.ParseUUIDPipe({
    version: '4',
    errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
});
let MeasurementsController = class MeasurementsController {
    measurementsService;
    indicatorsService;
    constructor(measurementsService, indicatorsService) {
        this.measurementsService = measurementsService;
        this.indicatorsService = indicatorsService;
    }
    async create(indicatorId, dto) {
        return this.measurementsService.create(indicatorId, dto);
    }
    async findAll(indicatorId, startDate, endDate) {
        return this.measurementsService.findAll(indicatorId, {
            startDate,
            endDate,
        });
    }
    async update(indicatorId, measurementId, dto) {
        return this.measurementsService.update(indicatorId, measurementId, dto);
    }
    async remove(indicatorId, measurementId) {
        return this.measurementsService.remove(indicatorId, measurementId);
    }
    async getAnalytics(indicatorId) {
        return this.indicatorsService.getAnalytics(indicatorId);
    }
    async getHistory(indicatorId, startDate, endDate) {
        return this.indicatorsService.getHistory(indicatorId, startDate, endDate);
    }
};
exports.MeasurementsController = MeasurementsController;
__decorate([
    (0, common_1.Post)('measurements'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar medição',
        description: 'Cria uma nova medição para o indicador. Atualiza automaticamente currentValue, previousValue, variation, daysRemaining e status.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: create_measurement_dto_1.CreateMeasurementDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Medição criada.' }),
    (0, swagger_1.ApiConflictResponse)({
        description: 'Já existe uma medição para essa data neste indicador.',
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Token inválido ou ausente.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_measurement_dto_1.CreateMeasurementDto]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('measurements'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar medições',
        description: 'Retorna todas as medições do indicador, ordenadas por data desc. Suporta filtro de período.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        example: '2026-01-01',
        description: 'Filtrar a partir desta data (ISO 8601).',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        example: '2026-12-31',
        description: 'Filtrar até esta data (ISO 8601).',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de medições.' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)('measurements/:measurementId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Atualizar medição',
        description: 'Atualiza campos de uma medição existente. Sincroniza automaticamente os caches do indicador.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiParam)({ name: 'measurementId', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: update_measurement_dto_1.UpdateMeasurementDto }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Data duplicada.' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador ou medição não encontrada.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Param)('measurementId', uuidPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_measurement_dto_1.UpdateMeasurementDto]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('measurements/:measurementId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Excluir medição',
        description: 'Remove uma medição. Recalcula automaticamente os caches do indicador.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiParam)({ name: 'measurementId', format: 'uuid' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador ou medição não encontrada.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Param)('measurementId', uuidPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Analytics do indicador',
        description: 'Retorna cálculos analíticos em tempo real: variação, atingimento de meta, dias restantes e status.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resultado analítico.',
        schema: {
            example: {
                currentValue: 1590,
                previousValue: 1300,
                variation: 22.3076923077,
                variationCalculationStatus: 'CALCULATED',
                targetAchievementPercentage: 45.4285714286,
                targetDifference: -1910,
                targetStatus: 'AT_RISK',
                daysRemaining: 21,
                isOverdue: false,
                lastMeasurementDate: '2026-08-07',
                computedStatus: 'WARNING',
            },
        },
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Histórico de medições',
        description: 'Retorna todas as medições do indicador em ordem cronológica, com filtro de período opcional.',
    }),
    (0, swagger_1.ApiParam)({ name: 'indicatorId', format: 'uuid' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, example: '2026-01-01' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, example: '2026-12-31' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Indicador não encontrado.' }),
    __param(0, (0, common_1.Param)('indicatorId', uuidPipe)),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "getHistory", null);
exports.MeasurementsController = MeasurementsController = __decorate([
    (0, swagger_1.ApiTags)('Indicator Measurements'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('indicators/:indicatorId'),
    __metadata("design:paramtypes", [measurements_service_1.MeasurementsService,
        indicators_service_1.IndicatorsService])
], MeasurementsController);
//# sourceMappingURL=measurements.controller.js.map