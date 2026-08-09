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
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { MeasurementsService } from './measurements.service';
import { IndicatorsService } from './indicators.service';

const uuidPipe = new ParseUUIDPipe({
  version: '4',
  errorHttpStatusCode: HttpStatus.BAD_REQUEST,
});

@ApiTags('Indicator Measurements')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('indicators/:indicatorId')
export class MeasurementsController {
  constructor(
    private readonly measurementsService: MeasurementsService,
    private readonly indicatorsService: IndicatorsService,
  ) {}

  // ─── POST /indicators/:indicatorId/measurements ──────────────────────────

  @Post('measurements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar medição',
    description:
      'Cria uma nova medição para o indicador. Atualiza automaticamente currentValue, previousValue, variation, daysRemaining e status.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiBody({ type: CreateMeasurementDto })
  @ApiResponse({ status: 201, description: 'Medição criada.' })
  @ApiConflictResponse({
    description: 'Já existe uma medição para essa data neste indicador.',
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  async create(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.measurementsService.create(indicatorId, dto);
  }

  // ─── POST /indicators/:indicatorId/measurements/upsert ──────────────────

  @Post('measurements/upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Criar ou atualizar medição (upsert)',
    description:
      'Se já existe uma medição para o indicador na data informada, atualiza o valor. Caso contrário, cria uma nova medição. Ideal para o fluxo de edição de indicador.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiBody({ type: CreateMeasurementDto })
  @ApiResponse({ status: 200, description: 'Medição criada ou atualizada.' })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  async upsert(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.measurementsService.upsert(indicatorId, dto);
  }

  // ─── GET /indicators/:indicatorId/measurements ───────────────────────────

  @Get('measurements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar medições',
    description:
      'Retorna todas as medições do indicador, ordenadas por data desc. Suporta filtro de período.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2026-01-01',
    description: 'Filtrar a partir desta data (ISO 8601).',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2026-12-31',
    description: 'Filtrar até esta data (ISO 8601).',
  })
  @ApiResponse({ status: 200, description: 'Lista de medições.' })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  async findAll(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.measurementsService.findAll(indicatorId, {
      startDate,
      endDate,
    });
  }

  // ─── PATCH /indicators/:indicatorId/measurements/:measurementId ──────────

  @Patch('measurements/:measurementId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar medição',
    description:
      'Atualiza campos de uma medição existente. Sincroniza automaticamente os caches do indicador.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiParam({ name: 'measurementId', format: 'uuid' })
  @ApiBody({ type: UpdateMeasurementDto })
  @ApiConflictResponse({ description: 'Data duplicada.' })
  @ApiNotFoundResponse({ description: 'Indicador ou medição não encontrada.' })
  async update(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Param('measurementId', uuidPipe) measurementId: string,
    @Body() dto: UpdateMeasurementDto,
  ) {
    return this.measurementsService.update(indicatorId, measurementId, dto);
  }

  // ─── DELETE /indicators/:indicatorId/measurements/:measurementId ─────────

  @Delete('measurements/:measurementId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir medição',
    description:
      'Remove uma medição. Recalcula automaticamente os caches do indicador.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiParam({ name: 'measurementId', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'Indicador ou medição não encontrada.' })
  async remove(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Param('measurementId', uuidPipe) measurementId: string,
  ) {
    return this.measurementsService.remove(indicatorId, measurementId);
  }

  // ─── GET /indicators/:indicatorId/analytics ──────────────────────────────

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analytics do indicador',
    description:
      'Retorna cálculos analíticos em tempo real: variação, atingimento de meta, dias restantes e status.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Resultado analítico.',
    schema: {
      example: {
        currentValue: 1590,
        previousValue: 1300,
        variation: 22.3076923077,
        variationCalculationStatus: 'CALCULATED',
        targetAchievementPercentage: 45.4285714286,
        targetDifference: -1910,
        targetStatus: 'AT_RISK',
        daysRemaining: 21,
        isOverdue: false,
        lastMeasurementDate: '2026-08-07',
        computedStatus: 'WARNING',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  async getAnalytics(@Param('indicatorId', uuidPipe) indicatorId: string) {
    return this.indicatorsService.getAnalytics(indicatorId);
  }

  // ─── GET /indicators/:indicatorId/measurements/timeline ─────────────────
  // Nota: O endpoint /history foi movido para IndicatorHistoryController
  // (resultados históricos consolidados por período). Este endpoint retorna
  // as medições pontuais do indicador em ordem cronológica.

  @Get('measurements/timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Timeline de medições (ordem cronológica)',
    description:
      'Retorna todas as medições pontuais do indicador em ordem cronológica. ' +
      'Para o histórico consolidado por período, use GET /indicators/:indicatorId/history.',
  })
  @ApiParam({ name: 'indicatorId', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiNotFoundResponse({ description: 'Indicador não encontrado.' })
  async getMeasurementTimeline(
    @Param('indicatorId', uuidPipe) indicatorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.indicatorsService.getHistory(indicatorId, startDate, endDate);
  }
}
