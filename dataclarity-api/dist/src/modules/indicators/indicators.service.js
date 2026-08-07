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
let IndicatorsService = class IndicatorsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return await this.prisma.indicator.create({
            data: {
                name: dto.name,
                description: dto.description ?? null,
                category: dto.category,
                formula: dto.formula ?? null,
                unit: dto.unit ?? null,
                goalValue: dto.goalValue ?? null,
                currentValue: dto.currentValue ?? null,
                previousValue: dto.previousValue ?? null,
                previousPeriod: dto.previousPeriod ?? null,
                variation: dto.variation ?? null,
                status: dto.status,
                color: dto.color ?? null,
                icon: dto.icon ?? null,
                chartType: dto.chartType,
                isActive: dto.isActive ?? true,
                showOnDashboard: dto.showOnDashboard ?? false,
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
            }),
            this.prisma.indicator.count({ where }),
        ]);
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        return {
            items,
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
        const indicator = await this.prisma.indicator.findUnique({ where: { id } });
        if (!indicator)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return indicator;
    }
    async findDashboard() {
        return await this.prisma.indicator.findMany({
            where: { showOnDashboard: true, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async findByCategory(category) {
        return await this.prisma.indicator.findMany({
            where: { category, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async getSummary() {
        const [total, active, inactive, grouped] = await Promise.all([
            this.prisma.indicator.count(),
            this.prisma.indicator.count({ where: { isActive: true } }),
            this.prisma.indicator.count({ where: { isActive: false } }),
            this.prisma.indicator.groupBy({
                by: ['category'],
                _count: { category: true },
            }),
        ]);
        const categories = grouped.map((g) => g.category);
        return { total, active, inactive, categories };
    }
    async update(id, dto) {
        const exists = await this.prisma.indicator.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return this.prisma.indicator.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(dto.formula !== undefined && { formula: dto.formula }),
                ...(dto.unit !== undefined && { unit: dto.unit }),
                ...(dto.goalValue !== undefined && { goalValue: dto.goalValue }),
                ...(dto.currentValue !== undefined && {
                    currentValue: dto.currentValue,
                }),
                ...(dto.previousValue !== undefined && {
                    previousValue: dto.previousValue,
                }),
                ...(dto.previousPeriod !== undefined && {
                    previousPeriod: dto.previousPeriod,
                }),
                ...(dto.variation !== undefined && { variation: dto.variation }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.color !== undefined && { color: dto.color }),
                ...(dto.icon !== undefined && { icon: dto.icon }),
                ...(dto.chartType !== undefined && { chartType: dto.chartType }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.showOnDashboard !== undefined && {
                    showOnDashboard: dto.showOnDashboard,
                }),
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
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map