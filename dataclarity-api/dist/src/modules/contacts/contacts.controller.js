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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const create_contact_dto_1 = require("./dto/create-contact.dto");
const list_contacts_query_dto_1 = require("./dto/list-contacts-query.dto");
const update_contact_dto_1 = require("./dto/update-contact.dto");
const contact_entity_1 = require("./entities/contact.entity");
const contacts_service_1 = require("./contacts.service");
let ContactsController = class ContactsController {
    contactsService;
    constructor(contactsService) {
        this.contactsService = contactsService;
    }
    async create(dto) {
        return this.contactsService.create(dto);
    }
    async findAll(query) {
        return this.contactsService.findAll(query);
    }
    async findOne(id) {
        return this.contactsService.findOne(id);
    }
    async update(id, dto) {
        return this.contactsService.update(id, dto);
    }
    async remove(id) {
        return this.contactsService.remove(id);
    }
};
exports.ContactsController = ContactsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Criar contato',
        description: 'Cria um novo contato a partir dos dados do formulário da landing page.',
    }),
    (0, swagger_1.ApiBody)({ type: create_contact_dto_1.CreateContactDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Contato criado.',
        type: contact_entity_1.ContactEntity,
    }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Rate limit excedido.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_contact_dto_1.CreateContactDto]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar contatos',
        description: 'Retorna lista paginada de contatos com filtros opcionais.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        example: 1,
        description: 'Página (padrão: 1).',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 20,
        description: 'Itens por página (máx: 100).',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED'],
        description: 'Filtrar por status.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        example: 'joao',
        description: 'Pesquisa em name, email, company e subject.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        example: 'createdAt',
        enum: ['createdAt'],
        description: 'Campo de ordenação.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        example: 'desc',
        enum: ['asc', 'desc'],
        description: 'Direção da ordenação.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista paginada de contatos.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Parâmetros inválidos.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Rate limit excedido.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_contacts_query_dto_1.ListContactsQueryDto]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar contato por ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do contato.', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Contato encontrado.',
        type: contact_entity_1.ContactEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Contato não encontrado.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'UUID inválido.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Rate limit excedido.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Atualizar contato',
        description: 'Atualiza campos do contato. Todos os campos são opcionais.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do contato.', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: update_contact_dto_1.UpdateContactDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Contato atualizado.',
        type: contact_entity_1.ContactEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Contato não encontrado.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Erro de validação ou UUID inválido.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Rate limit excedido.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_contact_dto_1.UpdateContactDto]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Excluir contato' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'UUID do contato.', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Contato excluído.',
        type: contact_entity_1.ContactEntity,
    }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Contato não encontrado.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'UUID inválido.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ description: 'Rate limit excedido.' }),
    (0, swagger_1.ApiInternalServerErrorResponse)({ description: 'Erro inesperado.' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ContactsController.prototype, "remove", null);
exports.ContactsController = ContactsController = __decorate([
    (0, swagger_1.ApiTags)('Contacts'),
    (0, common_1.Controller)('contacts'),
    __metadata("design:paramtypes", [contacts_service_1.ContactsService])
], ContactsController);
//# sourceMappingURL=contacts.controller.js.map