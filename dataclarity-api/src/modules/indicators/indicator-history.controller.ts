import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIndicatorHistoryDto } from './dto/create-indicator-history.dto';
import { IndicatorHistoryEntity } from './entities/indicator-history.entity';
import { IndicatorHistoryService } from './indicator-history.service';

const uuidPipe = new ParseUUIDPipe({
  version: '4',
  errorHttpStatusCode: HttpStatus.BAD_REQUEST,
});

@ApiTags('Indicator History')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('indicators/:indicatorId/history')
export class IndicatorHistoryController {
  constructor(private readonly historyService: IndicatorHistoryService) {}

  // ─── POST /indicators/:indicatorId/history ───────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar resultado histórico',
    description:
      'Cria um resultado consolidado para o período informado. ' +
      'Não pode existir dois resultados para o mesmo indicador no exato mesmo período.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiBody({ type: CreateIndicatorHistoryDto })
  @ApiResponse({
    status: 201,
    description: 'Resultado histórico criado.',
    type: IndicatorHistoryEntity,
  })
  @ApiConflictResponse({
    description: 'Já existe um resultado para este período neste indicador.',
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  async create(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Body() dto: CreateIndicatorHistoryDto,
  ): Promise<IndicatorHistoryEntity> {
    return this.historyService.create(
      indicatorId,
      dto,
    ) as Promise<IndicatorHistoryEntity>;
  }

  // ─── GET /indicators/:indicatorId/history ────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar histórico de resultados',
    description:
      'Retorna os resultados históricos do indicador ordenados por periodStart decrescente. ' +
      'Suporta paginação e filtro de período.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2026-01-01',
    description: 'Filtrar resultados com periodStart >= esta data.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2026-12-31',
    description: 'Filtrar resultados com periodStart <= esta data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de resultados históricos.',
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  async findAll(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.historyService.findAll(indicatorId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate,
      endDate,
    });
  }

  // ─── GET /indicators/:indicatorId/history/:id ─────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalhar resultado histórico por ID' })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Resultado histórico encontrado.',
    type: IndicatorHistoryEntity,
  })
  @ApiNotFoundResponse({ description: 'Resultado histórico não encontrado.' })
  async findOne(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Param('id', uuidPipe) id: string,
  ): Promise<IndicatorHistoryEntity> {
    return this.historyService.findOne(
      indicatorId,
      id,
    ) as Promise<IndicatorHistoryEntity>;
  }

  // ─── DELETE /indicators/:indicatorId/history/:id ─────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover resultado histórico',
    description: 'Remove um resultado histórico específico do indicador.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Resultado histórico removido.',
    type: IndicatorHistoryEntity,
  })
  @ApiNotFoundResponse({ description: 'Resultado histórico não encontrado.' })
  async remove(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Param('id', uuidPipe) id: string,
  ): Promise<IndicatorHistoryEntity> {
    return this.historyService.remove(
      indicatorId,
      id,
    ) as Promise<IndicatorHistoryEntity>;
  }
}
