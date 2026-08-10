import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { AggregationType } from '../enums/aggregation-type.enum';
import { DashboardSlot } from '../enums/dashboard-slot.enum';
import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorDesiredDirection } from '../enums/indicator-desired-direction.enum';
import { IndicatorFrequency } from '../enums/indicator-frequency.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Valida que formula está presente e não vazia quando aggregationType = FORMULA.
 * A fórmula é tratada como dado declarativo — NUNCA é executada diretamente.
 *
 * O validator é aplicado no campo `aggregationType` para que seja sempre avaliado
 * quando o campo está presente (class-validator não avalia validators de campos
 * undefined, então colocamos a validação cruzada aqui).
 */
@ValidatorConstraint({ name: 'FormulaRequiredWhenFormula', async: false })
class FormulaRequiredConstraint implements ValidatorConstraintInterface {
  validate(
    aggregationType: AggregationType | undefined,
    args: ValidationArguments,
  ): boolean {
    if (aggregationType !== AggregationType.FORMULA) return true;
    const obj = args.object as CreateIndicatorDto;
    return typeof obj.formula === 'string' && obj.formula.trim().length > 0;
  }
  defaultMessage(): string {
    return 'formula é obrigatório e não pode ser vazio quando aggregationType é FORMULA.';
  }
}

export class CreateIndicatorDto {
  @ApiProperty({ example: 'Receita Total', minLength: 2, maxLength: 120 })
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Receita bruta acumulada no mês',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: IndicatorCategory,
    example: IndicatorCategory.FINANCIAL,
  })
  @IsEnum(IndicatorCategory)
  category!: IndicatorCategory;

  @ApiPropertyOptional({
    example: 'SUM(receitas) - SUM(devoluções)',
    maxLength: 300,
    description:
      'Expressão declarativa do cálculo. Obrigatório quando aggregationType=FORMULA. ' +
      'Tratado como dado — NUNCA é executado diretamente (sem eval/new Function).',
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(300)
  formula?: string;

  @ApiPropertyOptional({ example: 'BRL', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({
    example: 3000,
    description:
      'Meta principal (usado em HIGHER_IS_BETTER e LOWER_IS_BETTER).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  goalValue?: number;

  @ApiPropertyOptional({
    example: 900,
    description: 'Valor mínimo da faixa (obrigatório para RANGE_IS_BETTER).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @ValidateIf(
    (o: CreateIndicatorDto) =>
      o.desiredDirection === IndicatorDesiredDirection.RANGE_IS_BETTER,
  )
  minimumGoalValue?: number;

  @ApiPropertyOptional({
    example: 1200,
    description: 'Valor máximo da faixa (obrigatório para RANGE_IS_BETTER).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @ValidateIf(
    (o: CreateIndicatorDto) =>
      o.desiredDirection === IndicatorDesiredDirection.RANGE_IS_BETTER,
  )
  maximumGoalValue?: number;

  @ApiPropertyOptional({
    enum: IndicatorDesiredDirection,
    example: IndicatorDesiredDirection.HIGHER_IS_BETTER,
    default: IndicatorDesiredDirection.HIGHER_IS_BETTER,
    description:
      'Define se maior é melhor (ex: receita), menor é melhor (ex: custo) ou faixa (ex: glicemia).',
  })
  @IsOptional()
  @IsEnum(IndicatorDesiredDirection)
  desiredDirection?: IndicatorDesiredDirection;

  @ApiPropertyOptional({
    enum: IndicatorFrequency,
    example: IndicatorFrequency.MONTHLY,
    default: IndicatorFrequency.MONTHLY,
    description:
      'Periodicidade de Apuração: frequência com que o indicador gera um novo resultado ' +
      '(ex: MONTHLY = mensal). Não confundir com previousPeriod (Período de Referência).',
  })
  @IsOptional()
  @IsEnum(IndicatorFrequency)
  frequency?: IndicatorFrequency;

  @ApiPropertyOptional({
    enum: IndicatorPeriod,
    example: IndicatorPeriod.PREVIOUS_MONTH,
    description: 'Período de referência do valor anterior (informativo).',
  })
  @IsOptional()
  @IsEnum(IndicatorPeriod)
  previousPeriod?: IndicatorPeriod;

  @ApiProperty({ enum: IndicatorChartType, example: IndicatorChartType.NUMBER })
  @IsEnum(IndicatorChartType)
  chartType!: IndicatorChartType;

  @ApiPropertyOptional({ example: '#4c6ef5', maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(30)
  color?: string | null;

  @ApiPropertyOptional({
    example: 'trending_up',
    maxLength: 60,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(60)
  icon?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
    description: 'Data de início do período de acompanhamento.',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  startDate?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-12-31T23:59:59.000Z',
    description:
      'Prazo final para atingir a meta. Não pode ser anterior a startDate.',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  endDate?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Exibir no Dashboard principal.',
  })
  @IsOptional()
  @IsBoolean()
  showOnDashboard?: boolean;

  @ApiPropertyOptional({
    enum: DashboardSlot,
    example: DashboardSlot.REVENUE,
    nullable: true,
    description:
      'Slot fixo do card no Dashboard: REVENUE, PROFIT, CUSTOMERS ou GROWTH. Deixe em branco para não vincular a nenhum card fixo.',
  })
  @IsOptional()
  @IsEnum(DashboardSlot)
  dashboardSlot?: DashboardSlot | null;

  @ApiPropertyOptional({
    enum: IndicatorStatus,
    example: IndicatorStatus.NEUTRAL,
    default: IndicatorStatus.NEUTRAL,
    description:
      'Status do resultado do indicador: SUCCESS, WARNING, DANGER ou NEUTRAL. O backend recalcula automaticamente ao adicionar medições.',
  })
  @IsOptional()
  @IsEnum(IndicatorStatus)
  status?: IndicatorStatus;

  @ApiPropertyOptional({
    enum: AggregationType,
    example: AggregationType.SUM,
    default: AggregationType.SUM,
    description:
      'Método de Apuração: define COMO o resultado do período é calculado. ' +
      'SUM/AVG/MIN/MAX/LAST/COUNT = calculado das medições do período. ' +
      'FORMULA = calculado pelo futuro Formula Engine usando o campo formula. ' +
      'IMPORTANTE: a fórmula é dado declarativo — nunca é executada diretamente.',
  })
  @IsOptional()
  @IsEnum(AggregationType)
  // Quando aggregationType=FORMULA, valida que formula está presente e não vazia
  @Validate(FormulaRequiredConstraint)
  aggregationType?: AggregationType;
}
