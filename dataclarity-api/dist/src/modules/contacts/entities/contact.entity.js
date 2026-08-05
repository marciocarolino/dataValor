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
exports.ContactEntity = void 0;
const swagger_1 = require("@nestjs/swagger");
const contact_status_enum_1 = require("../enums/contact-status.enum");
class ContactEntity {
    id;
    name;
    email;
    phone;
    company;
    subject;
    message;
    status;
    createdAt;
    updatedAt;
}
exports.ContactEntity = ContactEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], ContactEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'João da Silva' }),
    __metadata("design:type", String)
], ContactEntity.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'joao@email.com' }),
    __metadata("design:type", String)
], ContactEntity.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '61999999999', required: false, nullable: true }),
    __metadata("design:type", Object)
], ContactEntity.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Empresa XPTO', required: false, nullable: true }),
    __metadata("design:type", Object)
], ContactEntity.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Automação de relatórios',
        required: false,
        nullable: true,
    }),
    __metadata("design:type", Object)
], ContactEntity.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Preciso automatizar meus relatórios mensais.' }),
    __metadata("design:type", String)
], ContactEntity.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: contact_status_enum_1.ContactStatus, example: contact_status_enum_1.ContactStatus.NEW }),
    __metadata("design:type", String)
], ContactEntity.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], ContactEntity.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", Date)
], ContactEntity.prototype, "updatedAt", void 0);
//# sourceMappingURL=contact.entity.js.map