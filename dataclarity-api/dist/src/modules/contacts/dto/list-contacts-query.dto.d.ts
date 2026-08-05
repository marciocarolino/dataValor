import { ContactStatus } from '../enums/contact-status.enum';
type SortBy = 'createdAt';
type SortOrder = 'asc' | 'desc';
export declare class ListContactsQueryDto {
    page?: number;
    limit?: number;
    status?: ContactStatus;
    search?: string;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
}
export {};
