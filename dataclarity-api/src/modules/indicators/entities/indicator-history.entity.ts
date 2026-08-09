import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IndicatorStatus } from '../enums/indicator-status.enum';

export class IndicatorHistoryEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  indicatorId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  periodStart!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  periodEnd!: Date;

  @ApiPropertyOptional({ example: 1500.0, nullable: true })
  value!: number | null;

  @ApiPropertyOptional({ example: 1400.0, nullable: true })
  goalValue!: number | null;

  @ApiPropertyOptional({ example: 1344.0, nullable: true })
  previousValue!: number | null;

  @ApiPropertyOptional({ example: 11.61, nullable: true })
  variationPercent!: number | null;

  @ApiProperty({ enum: IndicatorStatus, example: IndicatorStatus.SUCCESS })
  status!: IndicatorStatus;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  calculatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
