import type { Contact } from '../../../generated/prisma/index';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactStatus } from './enums/contact-status.enum';
import type { CreateContactDto } from './dto/create-contact.dto';
import type { UpdateContactDto } from './dto/update-contact.dto';
import type { ListContactsQueryDto } from './dto/list-contacts-query.dto';
export interface PaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface PaginatedResult<T> {
    items: T[];
    pagination: PaginationMeta;
}
export declare class ContactsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateContactDto): Promise<Contact>;
    findAll(query: ListContactsQueryDto): Promise<PaginatedResult<Contact>>;
    findOne(id: string): Promise<Contact>;
    update(id: string, dto: UpdateContactDto): Promise<Contact>;
    remove(id: string): Promise<Contact>;
    updateStatus(id: string, status: ContactStatus): Promise<Contact>;
}
