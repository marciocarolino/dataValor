import { ContactStatus } from '../enums/contact-status.enum';
export declare class UpdateContactDto {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    subject?: string;
    message?: string;
    status?: ContactStatus;
}
