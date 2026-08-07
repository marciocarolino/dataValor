import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AnalysisAggregation } from '../enums/analysis-aggregation.enum';
import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAnalysisDto {
  @ApiProperty({
    example: 'Receita por Categoria Q3',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: 'Análise de receita agrupada por categoria',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: AnalysisChartType, example: AnalysisChartType.BAR })
  @IsEnum(AnalysisChartType)
  chartType!: AnalysisChartType;

  @ApiProperty({ enum: AnalysisCategory, example: AnalysisCategory.FINANCIAL })
  @IsEnum(AnalysisCategory)
  category!: AnalysisCategory;

  @ApiPropertyOptional({ example: 'sales', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(100)
  dataset?: string;

  @ApiPropertyOptional({ example: 'revenue', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(100)
  metric?: string;

  @ApiProperty({ enum: AnalysisAggregation, example: AnalysisAggregation.SUM })
  @IsEnum(AnalysisAggregation)
  aggregation!: AnalysisAggregation;

  @ApiPropertyOptional({ example: 'category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(100)
  groupBy?: string;

  @ApiPropertyOptional({ example: 'createdAt', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(100)
  dateField?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    example: '{"status":"active","region":"BR"}',
    description: 'Filtros adicionais em formato JSON string.',
  })
  @IsOptional()
  @IsJSON()
  filters?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'UUID do usuário criador.',
  })
  @IsOptional()
  @IsUUID('4')
  createdBy?: string;
}
