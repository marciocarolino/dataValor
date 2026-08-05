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
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const contact_status_enum_1 = require("./enums/contact-status.enum");
let ContactsService = class ContactsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const data = {
            name: dto.name,
            email: dto.email,
            phone: dto.phone ?? null,
            company: dto.company ?? null,
            subject: dto.subject ?? null,
            message: dto.message,
            status: contact_status_enum_1.ContactStatus.NEW,
        };
        return this.prisma.contact.create({ data });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { company: { contains: query.search, mode: 'insensitive' } },
                        { subject: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const orderBy = {
            createdAt: query.sortOrder ?? 'desc',
        };
        const [items, totalItems] = await this.prisma.$transaction([
            this.prisma.contact.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.contact.count({ where }),
        ]);
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        return {
            items,
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
    async findOne(id) {
        const contact = await this.prisma.contact.findUnique({ where: { id } });
        if (!contact)
            throw new common_1.NotFoundException('Contato não encontrado.');
        return contact;
    }
    async update(id, dto) {
        const exists = await this.prisma.contact.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Contato não encontrado.');
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.email !== undefined)
            data.email = dto.email;
        if (dto.phone !== undefined)
            data.phone = dto.phone;
        if (dto.company !== undefined)
            data.company = dto.company;
        if (dto.subject !== undefined)
            data.subject = dto.subject;
        if (dto.message !== undefined)
            data.message = dto.message;
        if (dto.status !== undefined)
            data.status = dto.status;
        return this.prisma.contact.update({ where: { id }, data });
    }
    async remove(id) {
        const exists = await this.prisma.contact.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Contato não encontrado.');
        return this.prisma.contact.delete({ where: { id } });
    }
    async updateStatus(id, status) {
        return this.update(id, { status });
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map