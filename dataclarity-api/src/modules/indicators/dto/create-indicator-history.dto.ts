import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { IndicatorStatus } from '../enums/indicator-status.enum';

/**
 * Valida que periodEnd não é anterior a periodStart.
 */
@ValidatorConstraint({ name: 'PeriodEndAfterStart', async: false })
class PeriodEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(periodEnd: string, args: ValidationArguments): boolean {
    const obj = args.object as CreateIndicatorHistoryDto;
    if (!obj.periodStart || !periodEnd) return true;
    return new Date(periodEnd) >= new Date(obj.periodStart);
  }

  defaultMessage(): string {
    return 'periodEnd não pode ser anterior a periodStart.';
  }
}

export class CreateIndicatorHistoryDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-01T00:00:00.000Z',
    description: 'Início do período do resultado (obrigatório).',
  })
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-31T23:59:59.000Z',
    description: 'Fim do período do resultado. Deve ser >= periodStart.',
  })
  @IsDateString()
  @IsNotEmpty()
  @Validate(PeriodEndAfterStartConstraint)
  periodEnd!: string;

  @ApiPropertyOptional({
    example: 1500.0,
    description: 'Valor realizado no período.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  value?: number;

  @ApiPropertyOptional({
    example: 1400.0,
    description: 'Meta do período.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  goalValue?: number;

  @ApiPropertyOptional({
    example: 1344.0,
    description: 'Valor do período anterior (para cálculo de variação).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  previousValue?: number;

  @ApiPropertyOptional({
    example: 11.61,
    description: 'Variação percentual em relação ao período anterior.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  variationPercent?: number;

  @ApiProperty({
    enum: IndicatorStatus,
    example: IndicatorStatus.SUCCESS,
    description:
      'Status do resultado do período: SUCCESS, WARNING, DANGER ou NEUTRAL.',
  })
  @IsEnum(IndicatorStatus)
  status!: IndicatorStatus;

  @ApiPropertyOptional({
    example: 'Resultado final após ajuste de estorno.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(500)
  notes?: string;
}
