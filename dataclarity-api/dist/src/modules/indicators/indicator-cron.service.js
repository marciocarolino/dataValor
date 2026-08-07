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
var IndicatorCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
let IndicatorCronService = IndicatorCronService_1 = class IndicatorCronService {
    prisma;
    logger = new common_1.Logger(IndicatorCronService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleMorning() {
        this.logger.log('[CRON 06:00] Atualizando dias restantes dos indicadores...');
        await this.recalcDaysRemaining();
    }
    async handleAfternoon() {
        this.logger.log('[CRON 13:00] Atualizando dias restantes dos indicadores...');
        await this.recalcDaysRemaining();
    }
    async handleEvening() {
        this.logger.log('[CRON 20:00] Atualizando dias restantes dos indicadores...');
        await this.recalcDaysRemaining();
    }
    async recalcDaysRemaining() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const indicators = await this.prisma.indicator.findMany({
            where: { endDate: { not: null } },
            select: { id: true, endDate: true, name: true },
        });
        let updated = 0;
        for (const ind of indicators) {
            const end = new Date(ind.endDate);
            end.setHours(0, 0, 0, 0);
            const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);
            await this.prisma.indicator.update({
                where: { id: ind.id },
                data: { daysRemaining: days },
            });
            updated++;
        }
        await this.prisma.indicator.updateMany({
            where: { endDate: null },
            data: { daysRemaining: null },
        });
        this.logger.log(`[CRON] ${updated} indicadores atualizados.`);
    }
};
exports.IndicatorCronService = IndicatorCronService;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', {
        name: 'indicator-days-morning',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorCronService.prototype, "handleMorning", null);
__decorate([
    (0, schedule_1.Cron)('0 16 * * *', {
        name: 'indicator-days-afternoon',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorCronService.prototype, "handleAfternoon", null);
__decorate([
    (0, schedule_1.Cron)('0 23 * * *', {
        name: 'indicator-days-evening',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorCronService.prototype, "handleEvening", null);
exports.IndicatorCronService = IndicatorCronService = IndicatorCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorCronService);
//# sourceMappingURL=indicator-cron.service.js.map