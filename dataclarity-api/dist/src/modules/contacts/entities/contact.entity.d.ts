import { ContactStatus } from '../enums/contact-status.enum';
export declare class ContactEntity {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    subject: string | null;
    message: string;
    status: ContactStatus;
    createdAt: Date;
    updatedAt: Date;
}
