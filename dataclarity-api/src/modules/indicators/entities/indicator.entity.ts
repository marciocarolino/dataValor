import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AggregationType } from '../enums/aggregation-type.enum';
import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorFrequency } from '../enums/indicator-frequency.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';

export class IndicatorEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Receita Total' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Receita bruta acumulada no mês',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    enum: IndicatorCategory,
    example: IndicatorCategory.FINANCIAL,
  })
  category!: IndicatorCategory;

  @ApiPropertyOptional({
    example: 'SUM(receitas) - SUM(devoluções)',
    nullable: true,
  })
  formula!: string | null;

  @ApiPropertyOptional({ example: 'BRL', nullable: true })
  unit!: string | null;

  @ApiPropertyOptional({ example: 3000000, nullable: true })
  goalValue!: number | null;

  @ApiPropertyOptional({ example: 2400000, nullable: true })
  currentValue!: number | null;

  @ApiPropertyOptional({ example: 2100000, nullable: true })
  previousValue!: number | null;

  @ApiProperty({
    enum: IndicatorFrequency,
    example: IndicatorFrequency.MONTHLY,
    description:
      'Periodicidade de Apuração: frequência com que o indicador gera um novo resultado.',
  })
  frequency!: IndicatorFrequency;

  @ApiPropertyOptional({
    enum: IndicatorPeriod,
    example: IndicatorPeriod.PREVIOUS_MONTH,
    nullable: true,
    description: 'Período de referência do valor anterior.',
  })
  previousPeriod!: IndicatorPeriod | null;

  @ApiPropertyOptional({ example: 14.28, nullable: true })
  variation!: number | null;

  @ApiProperty({ enum: IndicatorStatus, example: IndicatorStatus.SUCCESS })
  status!: IndicatorStatus;

  @ApiPropertyOptional({ example: '#4c6ef5', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ example: 'trending_up', nullable: true })
  icon!: string | null;

  @ApiProperty({ enum: IndicatorChartType, example: IndicatorChartType.LINE })
  chartType!: IndicatorChartType;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endDate!: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Dias restantes até o prazo (calculado automaticamente pelo cron). Negativo = prazo encerrado.',
  })
  daysRemaining!: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  showOnDashboard!: boolean;

  @ApiPropertyOptional({
    example: 'REVENUE',
    nullable: true,
    description:
      'Slot fixo do dashboard ao qual este indicador está vinculado: REVENUE, PROFIT, CUSTOMERS ou GROWTH. Null = não aparece em nenhum card fixo.',
  })
  dashboardSlot!: string | null;

  @ApiProperty({
    enum: AggregationType,
    example: AggregationType.SUM,
    description:
      'Método de Apuração: define COMO o resultado do período é calculado.',
  })
  aggregationType!: AggregationType;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
