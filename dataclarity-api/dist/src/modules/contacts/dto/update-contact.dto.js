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
exports.UpdateContactDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const contact_status_enum_1 = require("../enums/contact-status.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
class UpdateContactDto {
    name;
    email;
    phone;
    company;
    subject;
    message;
    status;
}
exports.UpdateContactDto = UpdateContactDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'João da Silva',
        minLength: 2,
        maxLength: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'joao@email.com', maxLength: 254 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '61999999999', maxLength: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Empresa XPTO', maxLength: 150 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Automação de relatórios', maxLength: 150 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Preciso automatizar meus relatórios mensais.',
        minLength: 10,
        maxLength: 5000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: contact_status_enum_1.ContactStatus,
        example: contact_status_enum_1.ContactStatus.CONTACTED,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(contact_status_enum_1.ContactStatus),
    __metadata("design:type", String)
], UpdateContactDto.prototype, "status", void 0);
//# sourceMappingURL=update-contact.dto.js.map