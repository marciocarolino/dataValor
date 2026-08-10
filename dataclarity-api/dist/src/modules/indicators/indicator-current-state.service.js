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
var IndicatorCurrentStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorCurrentStateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const indicator_status_enum_1 = require("./enums/indicator-status.enum");
let IndicatorCurrentStateService = IndicatorCurrentStateService_1 = class IndicatorCurrentStateService {
    prisma;
    logger = new common_1.Logger(IndicatorCurrentStateService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async syncFromHistory(indicatorId, history) {
        const exists = await this.prisma.indicator.findUnique({
            where: { id: indicatorId },
            select: { id: true },
        });
        if (!exists) {
            this.logger.warn(`[CurrentStateSync] Indicador ${indicatorId} não encontrado — sync ignorado.`);
            return {
                indicatorId,
                currentValue: null,
                status: indicator_status_enum_1.IndicatorStatus.NEUTRAL,
                synced: false,
            };
        }
        const status = history.status;
        const currentValue = this.toCurrentValue(history.value);
        await this.prisma.indicator.update({
            where: { id: indicatorId },
            data: {
                currentValue,
                status,
            },
        });
        this.logger.log(`[CurrentStateSync] Indicator ${indicatorId} sincronizado: currentValue=${String(currentValue)}, status=${status}`);
        return {
            indicatorId,
            currentValue,
            status,
            synced: true,
        };
    }
    toCurrentValue(value) {
        if (value == null)
            return null;
        let n;
        if (typeof value === 'object' && value !== null && 'toNumber' in value) {
            n = value.toNumber();
        }
        else {
            n = Number(value);
        }
        if (!isFinite(n) || isNaN(n))
            return null;
        return n;
    }
};
exports.IndicatorCurrentStateService = IndicatorCurrentStateService;
exports.IndicatorCurrentStateService = IndicatorCurrentStateService = IndicatorCurrentStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndicatorCurrentStateService);
//# sourceMappingURL=indicator-current-state.service.js.map