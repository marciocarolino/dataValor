import { CreateIndicatorHistoryDto } from './dto/create-indicator-history.dto';
import { IndicatorHistoryEntity } from './entities/indicator-history.entity';
import { IndicatorHistoryService } from './indicator-history.service';
export declare class IndicatorHistoryController {
    private readonly historyService;
    constructor(historyService: IndicatorHistoryService);
    create(indicatorId: string, dto: CreateIndicatorHistoryDto): Promise<IndicatorHistoryEntity>;
    findAll(indicatorId: string, page?: string, limit?: string, startDate?: string, endDate?: string): Promise<import("./indicator-history.service").HistoryListResult>;
    findOne(indicatorId: string, id: string): Promise<IndicatorHistoryEntity>;
    remove(indicatorId: string, id: string): Promise<IndicatorHistoryEntity>;
}
