import { PrismaService } from '../../prisma/prisma.service';
export declare class IndicatorCronService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleMorning(): Promise<void>;
    handleAfternoon(): Promise<void>;
    handleEvening(): Promise<void>;
    recalcDaysRemaining(): Promise<void>;
}
