import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisAggregation } from '../enums/analysis-aggregation.enum';
import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';

export class AnalysisEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Receita por Categoria Q3' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Análise de receita agrupada por categoria no Q3',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ enum: AnalysisChartType, example: AnalysisChartType.BAR })
  chartType!: AnalysisChartType;

  @ApiProperty({ enum: AnalysisCategory, example: AnalysisCategory.FINANCIAL })
  category!: AnalysisCategory;

  @ApiPropertyOptional({ example: 'sales', nullable: true })
  dataset!: string | null;

  @ApiPropertyOptional({ example: 'revenue', nullable: true })
  metric!: string | null;

  @ApiProperty({ enum: AnalysisAggregation, example: AnalysisAggregation.SUM })
  aggregation!: AnalysisAggregation;

  @ApiPropertyOptional({ example: 'category', nullable: true })
  groupBy!: string | null;

  @ApiPropertyOptional({ example: 'createdAt', nullable: true })
  dateField!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startDate!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endDate!: Date | null;

  @ApiPropertyOptional({
    example: { status: 'active', region: 'BR' },
    nullable: true,
    description: 'Filtros adicionais em formato JSON.',
  })
  filters!: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  isFavorite!: boolean;

  @ApiProperty({ example: false })
  isPublic!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdBy!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
