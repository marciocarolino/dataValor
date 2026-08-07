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
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AnalysisService = class AnalysisService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    get db() {
        return this.prisma;
    }
    async create(dto) {
        return await this.db.analysis.create({
            data: {
                name: dto.name,
                description: dto.description ?? null,
                chartType: dto.chartType,
                category: dto.category,
                dataset: dto.dataset ?? null,
                metric: dto.metric ?? null,
                aggregation: dto.aggregation,
                groupBy: dto.groupBy ?? null,
                dateField: dto.dateField ?? null,
                startDate: dto.startDate ?? null,
                endDate: dto.endDate ?? null,
                filters: dto.filters ? JSON.parse(dto.filters) : null,
                isFavorite: dto.isFavorite ?? false,
                isPublic: dto.isPublic ?? false,
                createdBy: dto.createdBy ?? null,
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            ...(query.name
                ? { name: { contains: query.name, mode: 'insensitive' } }
                : {}),
            ...(query.category ? { category: query.category } : {}),
            ...(query.chartType ? { chartType: query.chartType } : {}),
            ...(query.isFavorite !== undefined
                ? { isFavorite: query.isFavorite }
                : {}),
            ...(query.isPublic !== undefined ? { isPublic: query.isPublic } : {}),
            ...(query.createdBy ? { createdBy: query.createdBy } : {}),
            ...(query.startDate || query.endDate
                ? {
                    createdAt: {
                        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
                        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
                    },
                }
                : {}),
        };
        const orderBy = {
            [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        };
        const [items, totalItems] = await Promise.all([
            this.db.analysis.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.analysis.count({ where }),
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
        const analysis = await this.db.analysis.findUnique({ where: { id } });
        if (!analysis)
            throw new common_1.NotFoundException('Análise não encontrada.');
        return analysis;
    }
    async update(id, dto) {
        const exists = await this.db.analysis.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Análise não encontrada.');
        return this.db.analysis.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.chartType !== undefined && { chartType: dto.chartType }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(dto.dataset !== undefined && { dataset: dto.dataset }),
                ...(dto.metric !== undefined && { metric: dto.metric }),
                ...(dto.aggregation !== undefined && { aggregation: dto.aggregation }),
                ...(dto.groupBy !== undefined && { groupBy: dto.groupBy }),
                ...(dto.dateField !== undefined && { dateField: dto.dateField }),
                ...(dto.startDate !== undefined && { startDate: dto.startDate }),
                ...(dto.endDate !== undefined && { endDate: dto.endDate }),
                ...(dto.filters !== undefined && {
                    filters: dto.filters ? JSON.parse(dto.filters) : null,
                }),
                ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
                ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
                ...(dto.createdBy !== undefined && { createdBy: dto.createdBy }),
            },
        });
    }
    async remove(id) {
        const exists = await this.db.analysis.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Análise não encontrada.');
        return this.db.analysis.delete({ where: { id } });
    }
    async findFavorites() {
        return await this.db.analysis.findMany({
            where: { isFavorite: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findPublic() {
        return await this.db.analysis.findMany({
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByCategory(category) {
        return await this.db.analysis.findMany({
            where: { category },
            orderBy: { name: 'asc' },
        });
    }
    async toggleFavorite(id) {
        const analysis = await this.db.analysis.findUnique({
            where: { id },
            select: { id: true, isFavorite: true },
        });
        if (!analysis)
            throw new common_1.NotFoundException('Análise não encontrada.');
        return this.db.analysis.update({
            where: { id },
            data: { isFavorite: !analysis.isFavorite },
            select: { id: true, name: true, isFavorite: true },
        });
    }
    async getSummary() {
        const [total, favorites, isPublic, isPrivate, grouped] = await Promise.all([
            this.db.analysis.count(),
            this.db.analysis.count({ where: { isFavorite: true } }),
            this.db.analysis.count({ where: { isPublic: true } }),
            this.db.analysis.count({ where: { isPublic: false } }),
            this.db.analysis.groupBy({
                by: ['category'],
                _count: { category: true },
            }),
        ]);
        const categories = grouped.map((g) => g.category);
        return {
            total: total,
            favorites: favorites,
            isPublic: isPublic,
            isPrivate: isPrivate,
            categories,
        };
    }
    async execute(id) {
        const analysis = await this.db.analysis.findUnique({ where: { id } });
        if (!analysis)
            throw new common_1.NotFoundException('Análise não encontrada.');
        return this.buildSimulatedResult(analysis);
    }
    buildSimulatedResult(analysis) {
        const chartType = analysis.chartType ?? 'BAR';
        const metricName = analysis.metric ?? 'valor';
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const isKpi = chartType === 'KPI';
        const rawData = isKpi
            ? [Math.floor(Math.random() * 1_000_000)]
            : labels.map((_, i) => Math.floor(Math.random() * 100_000) + i * 8_000);
        const total = rawData.reduce((acc, v) => acc + v, 0);
        const lastTwo = rawData.length >= 2 ? rawData.slice(-2) : null;
        const growth = lastTwo && lastTwo[0] > 0
            ? parseFloat((((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100).toFixed(1))
            : null;
        return {
            title: analysis.name ?? 'Análise',
            description: analysis.description ?? null,
            chartType,
            labels: isKpi ? [metricName] : labels,
            datasets: [
                {
                    label: metricName,
                    data: rawData,
                },
            ],
            summary: {
                total,
                growth,
                records: rawData.length,
            },
        };
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map