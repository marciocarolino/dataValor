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
} from 'class-validator';
import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

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

  @ApiPropertyOptional({ example: 3000000 })
  @IsOptional()
  @IsNumber()
  goalValue?: number;

  @ApiPropertyOptional({ example: 2400000 })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional({ example: 2100000 })
  @IsOptional()
  @IsNumber()
  previousValue?: number;

  @ApiPropertyOptional({
    enum: IndicatorPeriod,
    example: IndicatorPeriod.PREVIOUS_MONTH,
    description:
      'Indica o período de referência do valor anterior: mês anterior, trimestre anterior, semestre anterior, ano anterior ou personalizado.',
  })
  @IsOptional()
  @IsEnum(IndicatorPeriod)
  previousPeriod?: IndicatorPeriod;

  @ApiPropertyOptional({ example: 14.28 })
  @IsOptional()
  @IsNumber()
  variation?: number;

  @ApiProperty({ enum: IndicatorStatus, example: IndicatorStatus.NEUTRAL })
  @IsEnum(IndicatorStatus)
  status!: IndicatorStatus;

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

  @ApiProperty({ enum: IndicatorChartType, example: IndicatorChartType.NUMBER })
  @IsEnum(IndicatorChartType)
  chartType!: IndicatorChartType;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
    description: 'Data de início do período de acompanhamento do indicador.',
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
      'Data de término do período de acompanhamento do indicador (prazo para bater a meta).',
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
}
