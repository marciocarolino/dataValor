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
exports.IndicatorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const indicator_analytics_service_1 = require("./indicator-analytics.service");
const indicator_desired_direction_enum_1 = require("./enums/indicator-desired-direction.enum");
const indicator_status_enum_1 = require("./enums/indicator-status.enum");
let IndicatorsService = class IndicatorsService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    async create(dto) {
        const endDate = dto.endDate ? new Date(dto.endDate) : null;
        const { daysRemaining } = this.analytics.computeDaysRemaining(endDate);
        return this.prisma.indicator.create({
            data: {
                name: dto.name,
                description: dto.description ?? null,
                category: dto.category,
                formula: dto.formula ?? null,
                unit: dto.unit ?? null,
                goalValue: dto.goalValue ?? null,
                minimumGoalValue: dto.minimumGoalValue ?? null,
                maximumGoalValue: dto.maximumGoalValue ?? null,
                desiredDirection: dto.desiredDirection ?? indicator_desired_direction_enum_1.IndicatorDesiredDirection.HIGHER_IS_BETTER,
                currentValue: null,
                previousValue: null,
                variation: null,
                status: dto.status ?? indicator_status_enum_1.IndicatorStatus.NEUTRAL,
                previousPeriod: dto.previousPeriod ?? null,
                color: dto.color ?? null,
                icon: dto.icon ?? null,
                chartType: dto.chartType,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate,
                daysRemaining,
                isActive: dto.isActive ?? true,
                showOnDashboard: dto.showOnDashboard ?? false,
                dashboardSlot: dto.dashboardSlot ?? null,
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            ...(query.category ? { category: query.category } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.showOnDashboard !== undefined
                ? { showOnDashboard: query.showOnDashboard }
                : {}),
            ...(query.desiredDirection
                ? { desiredDirection: query.desiredDirection }
                : {}),
            ...(query.name
                ? { name: { contains: query.name, mode: 'insensitive' } }
                : {}),
        };
        const orderBy = {
            [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        };
        const [items, totalItems] = await Promise.all([
            this.prisma.indicator.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    measurements: {
                        orderBy: { referenceDate: 'desc' },
                        take: 2,
                        select: { value: true, referenceDate: true },
                    },
                },
            }),
            this.prisma.indicator.count({ where }),
        ]);
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        return {
            items: items.map((ind) => this.withAnalytics(ind)),
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1 && totalPages > 0,
            },
        };
    }
    async findOne(id) {
        const indicator = await this.prisma.indicator.findUnique({
            where: { id },
            include: {
                measurements: {
                    orderBy: { referenceDate: 'desc' },
                    take: 2,
                    select: { value: true, referenceDate: true },
                },
            },
        });
        if (!indicator)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return this.withAnalytics(indicator);
    }
    async getAnalytics(id) {
        const indicator = await this.prisma.indicator.findUnique({
            where: { id },
            include: {
                measurements: {
                    orderBy: { referenceDate: 'desc' },
                    take: 2,
                    select: { value: true, referenceDate: true },
                },
            },
        });
        if (!indicator)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        const input = this.buildAnalyticsInput(indicator);
        return this.analytics.compute(input);
    }
    async getHistory(id, startDate, endDate) {
        const indicator = await this.prisma.indicator.findUnique({ where: { id } });
        if (!indicator)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        const where = { indicatorId: id };
        if (startDate || endDate) {
            const df = {};
            if (startDate)
                df['gte'] = new Date(startDate);
            if (endDate)
                df['lte'] = new Date(endDate);
            where['referenceDate'] = df;
        }
        return this.prisma.indicatorMeasurement.findMany({
            where,
            orderBy: { referenceDate: 'asc' },
        });
    }
    async getDashboardSummary() {
        const [total, active, inactive, byStatusRaw, catRaw] = await Promise.all([
            this.prisma.indicator.count(),
            this.prisma.indicator.count({ where: { isActive: true } }),
            this.prisma.indicator.count({ where: { isActive: false } }),
            this.prisma.indicator.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.indicator.groupBy({
                by: ['category'],
                _count: { category: true },
            }),
        ]);
        const byStatus = {
            [indicator_status_enum_1.IndicatorStatus.SUCCESS]: 0,
            [indicator_status_enum_1.IndicatorStatus.WARNING]: 0,
            [indicator_status_enum_1.IndicatorStatus.DANGER]: 0,
            [indicator_status_enum_1.IndicatorStatus.NEUTRAL]: 0,
        };
        for (const row of byStatusRaw) {
            if (row.status in byStatus) {
                byStatus[row.status] = row._count.status;
            }
        }
        return {
            total,
            active,
            inactive,
            categories: catRaw.length,
            byStatus,
        };
    }
    async findDashboard() {
        const items = await this.prisma.indicator.findMany({
            where: { showOnDashboard: true, isActive: true },
            orderBy: { name: 'asc' },
            include: {
                measurements: {
                    orderBy: { referenceDate: 'desc' },
                    take: 2,
                    select: { value: true, referenceDate: true },
                },
            },
        });
        return items.map((ind) => this.withAnalytics(ind));
    }
    async findByCategory(category) {
        const items = await this.prisma.indicator.findMany({
            where: { category, isActive: true },
            orderBy: { name: 'asc' },
            include: {
                measurements: {
                    orderBy: { referenceDate: 'desc' },
                    take: 2,
                    select: { value: true, referenceDate: true },
                },
            },
        });
        return items.map((ind) => this.withAnalytics(ind));
    }
    async update(id, dto) {
        const existing = await this.prisma.indicator.findUnique({
            where: { id },
            select: { id: true, endDate: true, desiredDirection: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        const resolvedEndDate = 'endDate' in dto
            ? dto.endDate
                ? new Date(dto.endDate)
                : null
            : existing.endDate;
        const { daysRemaining } = this.analytics.computeDaysRemaining(resolvedEndDate);
        return this.prisma.indicator.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(dto.formula !== undefined && { formula: dto.formula }),
                ...(dto.unit !== undefined && { unit: dto.unit }),
                ...(dto.goalValue !== undefined && { goalValue: dto.goalValue }),
                ...(dto.minimumGoalValue !== undefined && {
                    minimumGoalValue: dto.minimumGoalValue ?? null,
                }),
                ...(dto.maximumGoalValue !== undefined && {
                    maximumGoalValue: dto.maximumGoalValue ?? null,
                }),
                ...(dto.desiredDirection !== undefined && {
                    desiredDirection: dto.desiredDirection,
                }),
                ...(dto.previousPeriod !== undefined && {
                    previousPeriod: dto.previousPeriod,
                }),
                ...('color' in dto && { color: dto.color ?? null }),
                ...('icon' in dto && { icon: dto.icon ?? null }),
                ...(dto.chartType !== undefined && { chartType: dto.chartType }),
                ...('startDate' in dto && {
                    startDate: dto.startDate ? new Date(dto.startDate) : null,
                }),
                ...('endDate' in dto && {
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                }),
                daysRemaining,
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.showOnDashboard !== undefined && {
                    showOnDashboard: dto.showOnDashboard,
                }),
                ...('dashboardSlot' in dto && {
                    dashboardSlot: dto.dashboardSlot ?? null,
                }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
        });
    }
    async remove(id) {
        const exists = await this.prisma.indicator.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return this.prisma.indicator.delete({ where: { id } });
    }
    async getSummary() {
        return this.getDashboardSummary();
    }
    buildAnalyticsInput(indicator) {
        return {
            measurements: (indicator.measurements ?? []).map((m) => ({
                value: m.value,
                referenceDate: m.referenceDate,
            })),
            goalValue: indicator.goalValue,
            minimumGoalValue: indicator.minimumGoalValue,
            maximumGoalValue: indicator.maximumGoalValue,
            desiredDirection: indicator.desiredDirection ??
                indicator_desired_direction_enum_1.IndicatorDesiredDirection.HIGHER_IS_BETTER,
            endDate: indicator.endDate,
        };
    }
    withAnalytics(indicator) {
        const input = this.buildAnalyticsInput(indicator);
        const analyticsResult = this.analytics.compute(input);
        const { measurements: _m, ...rest } = indicator;
        return {
            ...rest,
            analytics: {
                currentValue: analyticsResult.currentValue,
                previousValue: analyticsResult.previousValue,
                variation: analyticsResult.variation,
                variationCalculationStatus: analyticsResult.variationCalculationStatus,
                targetAchievementPercentage: analyticsResult.targetAchievementPercentage,
                targetDifference: analyticsResult.targetDifference,
                targetStatus: analyticsResult.targetStatus,
                daysRemaining: analyticsResult.daysRemaining,
                isOverdue: analyticsResult.isOverdue,
                lastMeasurementDate: analyticsResult.lastMeasurementDate,
            },
        };
    }
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        indicator_analytics_service_1.IndicatorAnalyticsService])
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map