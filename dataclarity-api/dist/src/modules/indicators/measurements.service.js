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
exports.MeasurementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const indicator_analytics_service_1 = require("./indicator-analytics.service");
const indicator_desired_direction_enum_1 = require("./enums/indicator-desired-direction.enum");
let MeasurementsService = class MeasurementsService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    async create(indicatorId, dto) {
        const indicator = await this.ensureIndicator(indicatorId);
        this.validateDates(dto.periodStart, dto.periodEnd);
        const refDate = new Date(dto.referenceDate);
        try {
            const measurement = await this.prisma.indicatorMeasurement.create({
                data: {
                    indicatorId,
                    value: dto.value,
                    referenceDate: refDate,
                    periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
                    periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
                    source: dto.source ?? null,
                    notes: dto.notes ?? null,
                },
            });
            await this.syncIndicatorCache(indicatorId, indicator);
            return measurement;
        }
        catch (err) {
            if (this.isUniqueViolation(err)) {
                throw new common_1.ConflictException(`Já existe uma medição para o indicador "${indicator.name}" na data ${dto.referenceDate}.`);
            }
            throw err;
        }
    }
    async upsert(indicatorId, dto) {
        const indicator = await this.ensureIndicator(indicatorId);
        this.validateDates(dto.periodStart, dto.periodEnd);
        const refDate = new Date(dto.referenceDate);
        const existing = await this.prisma.indicatorMeasurement.findUnique({
            where: {
                indicatorId_referenceDate: { indicatorId, referenceDate: refDate },
            },
        });
        if (existing) {
            const updated = await this.prisma.indicatorMeasurement.update({
                where: { id: existing.id },
                data: {
                    value: dto.value,
                    ...(dto.periodStart !== undefined && {
                        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
                    }),
                    ...(dto.periodEnd !== undefined && {
                        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
                    }),
                    ...(dto.source !== undefined && { source: dto.source ?? null }),
                    ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
                },
            });
            await this.syncIndicatorCache(indicatorId, indicator);
            return updated;
        }
        else {
            const created = await this.prisma.indicatorMeasurement.create({
                data: {
                    indicatorId,
                    value: dto.value,
                    referenceDate: refDate,
                    periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
                    periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
                    source: dto.source ?? null,
                    notes: dto.notes ?? null,
                },
            });
            await this.syncIndicatorCache(indicatorId, indicator);
            return created;
        }
    }
    async findAll(indicatorId, filters) {
        await this.ensureIndicator(indicatorId);
        const where = { indicatorId };
        if (filters?.startDate || filters?.endDate) {
            const dateFilter = {};
            if (filters.startDate)
                dateFilter['gte'] = new Date(filters.startDate);
            if (filters.endDate)
                dateFilter['lte'] = new Date(filters.endDate);
            where['referenceDate'] = dateFilter;
        }
        return this.prisma.indicatorMeasurement.findMany({
            where,
            orderBy: { referenceDate: 'desc' },
        });
    }
    async update(indicatorId, measurementId, dto) {
        const indicator = await this.ensureIndicator(indicatorId);
        const existing = await this.ensureMeasurement(measurementId, indicatorId);
        const periodStart = dto.periodStart !== undefined
            ? dto.periodStart
            : existing.periodStart?.toISOString();
        const periodEnd = dto.periodEnd !== undefined
            ? dto.periodEnd
            : existing.periodEnd?.toISOString();
        this.validateDates(periodStart, periodEnd);
        try {
            const updated = await this.prisma.indicatorMeasurement.update({
                where: { id: measurementId },
                data: {
                    ...(dto.value !== undefined && { value: dto.value }),
                    ...(dto.referenceDate !== undefined && {
                        referenceDate: new Date(dto.referenceDate),
                    }),
                    ...(dto.periodStart !== undefined && {
                        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
                    }),
                    ...(dto.periodEnd !== undefined && {
                        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
                    }),
                    ...(dto.source !== undefined && { source: dto.source ?? null }),
                    ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
                },
            });
            await this.syncIndicatorCache(indicatorId, indicator);
            return updated;
        }
        catch (err) {
            if (this.isUniqueViolation(err)) {
                throw new common_1.ConflictException(`Já existe uma medição para esse indicador na data informada.`);
            }
            throw err;
        }
    }
    async remove(indicatorId, measurementId) {
        const indicator = await this.ensureIndicator(indicatorId);
        await this.ensureMeasurement(measurementId, indicatorId);
        const deleted = await this.prisma.indicatorMeasurement.delete({
            where: { id: measurementId },
        });
        await this.syncIndicatorCache(indicatorId, indicator);
        return deleted;
    }
    async syncIndicatorCache(indicatorId, indicator) {
        const ind = indicator ??
            (await this.prisma.indicator.findUnique({ where: { id: indicatorId } }));
        if (!ind)
            return;
        const recentMeasurements = await this.prisma.indicatorMeasurement.findMany({
            where: { indicatorId },
            orderBy: { referenceDate: 'desc' },
            take: 2,
            select: { value: true, referenceDate: true },
        });
        const input = {
            measurements: recentMeasurements,
            goalValue: ind.goalValue,
            minimumGoalValue: ind.minimumGoalValue,
            maximumGoalValue: ind.maximumGoalValue,
            desiredDirection: ind.desiredDirection ??
                indicator_desired_direction_enum_1.IndicatorDesiredDirection.HIGHER_IS_BETTER,
            endDate: ind.endDate,
        };
        const result = this.analytics.compute(input);
        await this.prisma.indicator.update({
            where: { id: indicatorId },
            data: {
                currentValue: result.currentValue,
                previousValue: result.previousValue,
                variation: result.variation,
                daysRemaining: result.daysRemaining,
                status: result.computedStatus,
            },
        });
    }
    async ensureIndicator(id) {
        const ind = await this.prisma.indicator.findUnique({ where: { id } });
        if (!ind)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return ind;
    }
    async ensureMeasurement(id, indicatorId) {
        const m = await this.prisma.indicatorMeasurement.findFirst({
            where: { id, indicatorId },
        });
        if (!m)
            throw new common_1.NotFoundException(`Medição "${id}" não encontrada para este indicador.`);
        return m;
    }
    validateDates(periodStart, periodEnd) {
        if (periodStart && periodEnd) {
            if (new Date(periodEnd) < new Date(periodStart)) {
                throw new common_1.BadRequestException('periodEnd não pode ser anterior a periodStart.');
            }
        }
    }
    isUniqueViolation(err) {
        if (typeof err === 'object' && err !== null) {
            const e = err;
            return e['code'] === 'P2002';
        }
        return false;
    }
};
exports.MeasurementsService = MeasurementsService;
exports.MeasurementsService = MeasurementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        indicator_analytics_service_1.IndicatorAnalyticsService])
], MeasurementsService);
//# sourceMappingURL=measurements.service.js.map