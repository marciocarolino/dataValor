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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { ListIndicatorsQueryDto } from './dto/list-indicators-query.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { IndicatorEntity } from './entities/indicator.entity';
import { IndicatorsService } from './indicators.service';
import { IndicatorCategory } from './enums/indicator-category.enum';

@ApiTags('Indicators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  // ─── POST /indicators ─────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar indicador',
    description: 'Cria um novo indicador de negócio (KPI).',
  })
  @ApiBody({ type: CreateIndicatorDto })
  @ApiResponse({
    status: 201,
    description: 'Indicador criado.',
    type: IndicatorEntity,
  })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async create(@Body() dto: CreateIndicatorDto): Promise<IndicatorEntity> {
    return this.indicatorsService.create(dto) as Promise<IndicatorEntity>;
  }

  // ─── GET /indicators/dashboard ────────────────────────────────────────────
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Indicadores do Dashboard',
    description:
      'Retorna apenas os indicadores marcados para exibição no Dashboard principal.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de indicadores do dashboard.',
    type: [IndicatorEntity],
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findDashboard(): Promise<IndicatorEntity[]> {
    return this.indicatorsService.findDashboard() as Promise<IndicatorEntity[]>;
  }

  // ─── GET /indicators/summary ──────────────────────────────────────────────
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resumo dos indicadores',
    description: 'Retorna contagens e categorias existentes de indicadores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo dos indicadores.',
    schema: {
      example: {
        total: 10,
        active: 8,
        inactive: 2,
        categories: ['FINANCIAL', 'COMMERCIAL'],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async getSummary(): Promise<ReturnType<IndicatorsService['getSummary']>> {
    return this.indicatorsService.getSummary();
  }

  // ─── GET /indicators/category/:category ───────────────────────────────────
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar por categoria',
    description: 'Retorna indicadores ativos de uma categoria específica.',
  })
  @ApiParam({
    name: 'category',
    enum: IndicatorCategory,
    description: 'Categoria do indicador.',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores da categoria.',
    type: [IndicatorEntity],
  })
  @ApiBadRequestResponse({ description: 'Categoria inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findByCategory(
    @Param('category') category: IndicatorCategory,
  ): Promise<IndicatorEntity[]> {
    return this.indicatorsService.findByCategory(category) as Promise<
      IndicatorEntity[]
    >;
  }

  // ─── GET /indicators ──────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar indicadores',
    description: 'Retorna lista paginada de indicadores com filtros opcionais.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: IndicatorCategory,
    description: 'Filtrar por categoria.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL'],
    description: 'Filtrar por status.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    example: true,
    description: 'Filtrar por ativo/inativo.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    example: 'Receita',
    description: 'Buscar por nome.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'category', 'status', 'createdAt', 'currentValue'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista paginada de indicadores.' })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findAll(@Query() query: ListIndicatorsQueryDto) {
    return this.indicatorsService.findAll(query);
  }

  // ─── GET /indicators/:id ──────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar indicador por ID' })
  @ApiParam({ name: 'id', description: 'UUID do indicador.', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Indicador encontrado.',
    type: IndicatorEntity,
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
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
  ): Promise<IndicatorEntity> {
    return this.indicatorsService.findOne(id) as Promise<IndicatorEntity>;
  }

  // ─── PATCH /indicators/:id ────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar indicador',
    description: 'Atualiza campos do indicador. Todos os campos são opcionais.',
  })
  @ApiParam({ name: 'id', description: 'UUID do indicador.', format: 'uuid' })
  @ApiBody({ type: UpdateIndicatorDto })
  @ApiResponse({
    status: 200,
    description: 'Indicador atualizado.',
    type: IndicatorEntity,
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiBadRequestResponse({ description: 'Erro de validação ou UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
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
    @Body() dto: UpdateIndicatorDto,
  ): Promise<IndicatorEntity> {
    return this.indicatorsService.update(id, dto) as Promise<IndicatorEntity>;
  }

  // ─── DELETE /indicators/:id ───────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir indicador' })
  @ApiParam({ name: 'id', description: 'UUID do indicador.', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Indicador excluído.',
    type: IndicatorEntity,
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
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
  ): Promise<IndicatorEntity> {
    return this.indicatorsService.remove(id) as Promise<IndicatorEntity>;
  }
}
