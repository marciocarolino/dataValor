import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';

type SortBy = 'name' | 'category' | 'status' | 'createdAt' | 'currentValue';
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

export class ListIndicatorsQueryDto {
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
    enum: IndicatorCategory,
    description: 'Filtrar por categoria.',
  })
  @IsOptional()
  @IsEnum(IndicatorCategory)
  category?: IndicatorCategory;

  @ApiPropertyOptional({
    enum: IndicatorStatus,
    description: 'Filtrar por status.',
  })
  @IsOptional()
  @IsEnum(IndicatorStatus)
  status?: IndicatorStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por indicadores ativos (true) ou inativos (false).',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Pesquisa por nome.',
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    default: 'createdAt',
    enum: ['name', 'category', 'status', 'createdAt', 'currentValue'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'category', 'status', 'createdAt', 'currentValue'])
  sortBy?: SortBy = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: SortOrder = 'desc';
}
