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
exports.IndicatorHistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let IndicatorHistoryService = class IndicatorHistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(indicatorId, dto) {
        await this.ensureIndicator(indicatorId);
        const periodStart = new Date(dto.periodStart);
        const periodEnd = new Date(dto.periodEnd);
        if (periodEnd < periodStart) {
            throw new common_1.BadRequestException('periodEnd não pode ser anterior a periodStart.');
        }
        try {
            return (await this.prisma.indicatorHistory.create({
                data: {
                    indicatorId,
                    periodStart,
                    periodEnd,
                    value: dto.value ?? null,
                    goalValue: dto.goalValue ?? null,
                    previousValue: dto.previousValue ?? null,
                    variationPercent: dto.variationPercent ?? null,
                    status: dto.status,
                    notes: dto.notes ?? null,
                },
            }));
        }
        catch (err) {
            if (this.isUniqueViolation(err)) {
                throw new common_1.ConflictException('Já existe um resultado histórico para este indicador neste período exato.');
            }
            throw err;
        }
    }
    async findAll(indicatorId, query = {}) {
        await this.ensureIndicator(indicatorId);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = { indicatorId };
        if (query.startDate || query.endDate) {
            const periodFilter = {};
            if (query.startDate)
                periodFilter['gte'] = new Date(query.startDate);
            if (query.endDate)
                periodFilter['lte'] = new Date(query.endDate);
            where['periodStart'] = periodFilter;
        }
        const [items, totalItems] = await Promise.all([
            this.prisma.indicatorHistory.findMany({
                where,
                orderBy: { periodStart: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.indicatorHistory.count({ where }),
        ]);
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        return {
            items: items,
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
    async findOne(indicatorId, id) {
        await this.ensureIndicator(indicatorId);
        const record = await this.prisma.indicatorHistory.findFirst({
            where: { id, indicatorId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Resultado histórico não encontrado.');
        }
        return record;
    }
    async remove(indicatorId, id) {
        await this.ensureIndicator(indicatorId);
        const record = await this.prisma.indicatorHistory.findFirst({
            where: { id, indicatorId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Resultado histórico não encontrado.');
        }
        return (await this.prisma.indicatorHistory.delete({
            where: { id },
        }));
    }
    async ensureIndicator(id) {
        const ind = await this.prisma.indicator.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!ind)
            throw new common_1.NotFoundException('Indicador não encontrado.');
        return ind;
    }
    isUniqueViolation(err) {
        if (typeof err === 'object' && err !== null) {
            const e = err;
            return e['code'] === 'P2002';
        }
        return false;
    }
};
exports.IndicatorHistoryService = IndicatorHistoryService;
exports.IndicatorHistoryService = IndicatorHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorHistoryService);
//# sourceMappingURL=indicator-history.service.js.map