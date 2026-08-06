import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactEntity } from './entities/contact.entity';
import { ContactsService } from './contacts.service';
export declare class ContactsController {
    private readonly contactsService;
    constructor(contactsService: ContactsService);
    create(dto: CreateContactDto): Promise<ContactEntity>;
    findAll(query: ListContactsQueryDto): Promise<import("./contacts.service").PaginatedResult<{
        name: string;
        id: string;
        email: string;
        phone: string | null;
        company: string | null;
        subject: string | null;
        message: string;
        status: import("generated/prisma").$Enums.ContactStatus;
        createdAt: Date;
        updatedAt: Date;
    }>>;
    findOne(id: string): Promise<ContactEntity>;
    update(id: string, dto: UpdateContactDto): Promise<ContactEntity>;
    remove(id: string): Promise<ContactEntity>;
}
