import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';

type SortBy = 'name' | 'category' | 'chartType' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const toInt = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};

const toBool = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AnalysisFilterDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Busca textual por nome.',
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    enum: AnalysisCategory,
    description: 'Filtrar por categoria.',
  })
  @IsOptional()
  @IsEnum(AnalysisCategory)
  category?: AnalysisCategory;

  @ApiPropertyOptional({
    enum: AnalysisChartType,
    description: 'Filtrar por tipo de gráfico.',
  })
  @IsOptional()
  @IsEnum(AnalysisChartType)
  chartType?: AnalysisChartType;

  @ApiPropertyOptional({ description: 'Filtrar favoritas.' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar análises públicas.' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por criador.' })
  @IsOptional()
  @IsUUID('4')
  createdBy?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Criadas a partir desta data.',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Criadas até esta data.',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['name', 'category', 'chartType', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'category', 'chartType', 'createdAt', 'updatedAt'])
  sortBy?: SortBy = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: SortOrder = 'desc';
}
