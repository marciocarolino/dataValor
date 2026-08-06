import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactEntity } from './entities/contact.entity';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // ─── POST /contacts ────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Criar contato',
    description:
      'Cria um novo contato a partir dos dados do formulário da landing page.',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({
    status: 201,
    description: 'Contato criado.',
    type: ContactEntity,
  })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async create(@Body() dto: CreateContactDto): Promise<ContactEntity> {
    return this.contactsService.create(dto) as Promise<ContactEntity>;
  }

  // ─── GET /contacts ─────────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar contatos',
    description: 'Retorna lista paginada de contatos com filtros opcionais.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Página (padrão: 1).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Itens por página (máx: 100).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED'],
    description: 'Filtrar por status.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'joao',
    description: 'Pesquisa em name, email, company e subject.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'createdAt',
    enum: ['createdAt'],
    description: 'Campo de ordenação.',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
    description: 'Direção da ordenação.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de contatos.' })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findAll(@Query() query: ListContactsQueryDto) {
    return this.contactsService.findAll(query);
  }

  // ─── GET /contacts/:id ─────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar contato por ID' })
  @ApiParam({ name: 'id', description: 'UUID do contato.', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Contato encontrado.',
    type: ContactEntity,
  })
  @ApiNotFoundResponse({ description: 'Contato não encontrado.' })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<ContactEntity> {
    return this.contactsService.findOne(id) as Promise<ContactEntity>;
  }

  // ─── PATCH /contacts/:id ───────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar contato',
    description: 'Atualiza campos do contato. Todos os campos são opcionais.',
  })
  @ApiParam({ name: 'id', description: 'UUID do contato.', format: 'uuid' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({
    status: 200,
    description: 'Contato atualizado.',
    type: ContactEntity,
  })
  @ApiNotFoundResponse({ description: 'Contato não encontrado.' })
  @ApiBadRequestResponse({ description: 'Erro de validação ou UUID inválido.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactEntity> {
    return this.contactsService.update(id, dto) as Promise<ContactEntity>;
  }

  // ─── DELETE /contacts/:id ──────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir contato' })
  @ApiParam({ name: 'id', description: 'UUID do contato.', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Contato excluído.',
    type: ContactEntity,
  })
  @ApiNotFoundResponse({ description: 'Contato não encontrado.' })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<ContactEntity> {
    return this.contactsService.remove(id) as Promise<ContactEntity>;
  }
}
