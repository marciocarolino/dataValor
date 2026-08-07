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
    get db() {
        return this.prisma;
    }
    async create(dto) {
        return await this.db.indicator.create({
            data: {
                name: dto.name,
                description: dto.description ?? null,
                category: dto.category,
                formula: dto.formula ?? null,
                unit: dto.unit ?? null,
                goalValue: dto.goalValue ?? null,
                currentValue: dto.currentValue ?? null,
                previousValue: dto.previousValue ?? null,
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
            this.db.indicator.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.indicator.count({ where }),
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
        const indicator = await this.db.indicator.findUnique({ where: { id } });
        if (!indicator)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return indicator;
    }
    async findDashboard() {
        return await this.db.indicator.findMany({
            where: { showOnDashboard: true, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async findByCategory(category) {
        return await this.db.indicator.findMany({
            where: { category, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async getSummary() {
        const [total, active, inactive, grouped] = await Promise.all([
            this.db.indicator.count(),
            this.db.indicator.count({ where: { isActive: true } }),
            this.db.indicator.count({ where: { isActive: false } }),
            this.db.indicator.groupBy({
                by: ['category'],
                _count: { category: true },
            }),
        ]);
        const categories = grouped.map((g) => g.category);
        return { total, active, inactive, categories };
    }
    async update(id, dto) {
        const exists = await this.db.indicator.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        const data = {};
        if (dto.name !== undefined)
            data['name'] = dto.name;
        if (dto.description !== undefined)
            data['description'] = dto.description;
        if (dto.category !== undefined)
            data['category'] = dto.category;
        if (dto.formula !== undefined)
            data['formula'] = dto.formula;
        if (dto.unit !== undefined)
            data['unit'] = dto.unit;
        if (dto.goalValue !== undefined)
            data['goalValue'] = dto.goalValue;
        if (dto.currentValue !== undefined)
            data['currentValue'] = dto.currentValue;
        if (dto.previousValue !== undefined)
            data['previousValue'] = dto.previousValue;
        if (dto.variation !== undefined)
            data['variation'] = dto.variation;
        if (dto.status !== undefined)
            data['status'] = dto.status;
        if (dto.color !== undefined)
            data['color'] = dto.color;
        if (dto.icon !== undefined)
            data['icon'] = dto.icon;
        if (dto.chartType !== undefined)
            data['chartType'] = dto.chartType;
        if (dto.isActive !== undefined)
            data['isActive'] = dto.isActive;
        if (dto.showOnDashboard !== undefined)
            data['showOnDashboard'] = dto.showOnDashboard;
        return this.db.indicator.update({ where: { id }, data });
    }
    async remove(id) {
        const exists = await this.db.indicator.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return this.db.indicator.delete({ where: { id } });
    }
};
exports.IndicatorsService = IndicatorsService;
exports.IndicatorsService = IndicatorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorsService);
//# sourceMappingURL=indicators.service.js.map