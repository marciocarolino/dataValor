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
import { AnalysisFilterDto } from './dto/analysis-filter.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { AnalysisEntity } from './entities/analysis.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisCategory } from './enums/analysis-category.enum';
import { ExecuteAnalysisResultDto } from './dto/execute-analysis-result.dto';

@ApiTags('Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // ─── POST /analysis ────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar análise',
    description: 'Cria uma nova configuração de análise de dados.',
  })
  @ApiBody({ type: CreateAnalysisDto })
  @ApiResponse({
    status: 201,
    description: 'Análise criada.',
    type: AnalysisEntity,
  })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async create(@Body() dto: CreateAnalysisDto): Promise<AnalysisEntity> {
    return this.analysisService.create(dto) as Promise<AnalysisEntity>;
  }

  // ─── GET /analysis/favorites ───────────────────────────────────────────────
  @Get('favorites')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Análises favoritas',
    description: 'Retorna todas as análises marcadas como favoritas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de análises favoritas.',
    type: [AnalysisEntity],
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findFavorites(): Promise<AnalysisEntity[]> {
    return this.analysisService.findFavorites() as Promise<AnalysisEntity[]>;
  }

  // ─── GET /analysis/public ──────────────────────────────────────────────────
  @Get('public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Análises públicas',
    description: 'Retorna todas as análises compartilhadas publicamente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de análises públicas.',
    type: [AnalysisEntity],
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findPublic(): Promise<AnalysisEntity[]> {
    return this.analysisService.findPublic() as Promise<AnalysisEntity[]>;
  }

  // ─── GET /analysis/summary ─────────────────────────────────────────────────
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resumo das análises',
    description: 'Retorna contagens e categorias existentes de análises.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo das análises.',
    schema: {
      example: {
        total: 10,
        favorites: 3,
        isPublic: 4,
        isPrivate: 6,
        categories: ['FINANCIAL', 'COMMERCIAL'],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async getSummary(): Promise<ReturnType<AnalysisService['getSummary']>> {
    return this.analysisService.getSummary();
  }

  // ─── GET /analysis/category/:category ─────────────────────────────────────
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar por categoria',
    description: 'Retorna análises de uma categoria específica.',
  })
  @ApiParam({ name: 'category', enum: AnalysisCategory })
  @ApiResponse({
    status: 200,
    description: 'Análises da categoria.',
    type: [AnalysisEntity],
  })
  @ApiBadRequestResponse({ description: 'Categoria inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findByCategory(
    @Param('category') category: AnalysisCategory,
  ): Promise<AnalysisEntity[]> {
    return this.analysisService.findByCategory(category) as Promise<
      AnalysisEntity[]
    >;
  }

  // ─── GET /analysis ─────────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar análises',
    description:
      'Retorna lista paginada com filtros, ordenação e busca textual.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'name', required: false, example: 'Receita' })
  @ApiQuery({ name: 'category', required: false, enum: AnalysisCategory })
  @ApiQuery({
    name: 'chartType',
    required: false,
    enum: ['LINE', 'BAR', 'AREA', 'PIE', 'DONUT', 'TABLE', 'KPI'],
  })
  @ApiQuery({ name: 'isFavorite', required: false, example: true })
  @ApiQuery({ name: 'isPublic', required: false, example: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'category', 'chartType', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista paginada de análises.' })
  @ApiBadRequestResponse({ description: 'Parâmetros inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit excedido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async findAll(@Query() query: AnalysisFilterDto) {
    return this.analysisService.findAll(query);
  }

  // ─── GET /analysis/:id ─────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar análise por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Análise encontrada.',
    type: AnalysisEntity,
  })
  @ApiNotFoundResponse({ description: 'Análise não encontrada.' })
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
  ): Promise<AnalysisEntity> {
    return this.analysisService.findOne(id) as Promise<AnalysisEntity>;
  }

  // ─── PATCH /analysis/:id ───────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar análise',
    description: 'Atualiza campos da análise. Todos opcionais.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateAnalysisDto })
  @ApiResponse({
    status: 200,
    description: 'Análise atualizada.',
    type: AnalysisEntity,
  })
  @ApiNotFoundResponse({ description: 'Análise não encontrada.' })
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
    @Body() dto: UpdateAnalysisDto,
  ): Promise<AnalysisEntity> {
    return this.analysisService.update(id, dto) as Promise<AnalysisEntity>;
  }

  // ─── DELETE /analysis/:id ──────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir análise' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Análise excluída.',
    type: AnalysisEntity,
  })
  @ApiNotFoundResponse({ description: 'Análise não encontrada.' })
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
  ): Promise<AnalysisEntity> {
    return this.analysisService.remove(id) as Promise<AnalysisEntity>;
  }

  // ─── POST /analysis/:id/execute ───────────────────────────────────────────
  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Executar análise',
    description:
      'Executa a análise e retorna o payload padronizado para visualização no frontend. ' +
      'Contrato estável: quando integrado com Datasets/Indicators/AI Insights, ' +
      'apenas o método `buildSimulatedResult` no Service será substituído — ' +
      'sem necessidade de alterar o frontend.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Resultado padronizado da execução da análise.',
    type: ExecuteAnalysisResultDto,
  })
  @ApiNotFoundResponse({ description: 'Análise não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async execute(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<ExecuteAnalysisResultDto> {
    return this.analysisService.execute(id);
  }

  // ─── POST /analysis/:id/favorite ──────────────────────────────────────────
  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alternar favorito',
    description: 'Marca ou remove a análise como favorita (toggle).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Estado de favorito atualizado.',
    schema: { example: { id: 'uuid', name: 'Receita Q3', isFavorite: true } },
  })
  @ApiNotFoundResponse({ description: 'Análise não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiInternalServerErrorResponse({ description: 'Erro inesperado.' })
  async toggleFavorite(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    id: string,
  ): Promise<{ id: string; name: string; isFavorite: boolean }> {
    return this.analysisService.toggleFavorite(id) as Promise<{
      id: string;
      name: string;
      isFavorite: boolean;
    }>;
  }
}
