import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateMeasurementDto {
  @ApiProperty({
    example: 1590.5,
    description: 'Valor da medição (Decimal — não usar float para monetário).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  value!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-07T00:00:00.000Z',
    description: 'Data de referência da medição. Única por indicador.',
  })
  @IsDateString()
  @IsNotEmpty()
  referenceDate!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-31T23:59:59.000Z',
    description: 'periodEnd não pode ser anterior a periodStart.',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o: CreateMeasurementDto) => !!o.periodStart && !!o.periodEnd)
  periodEnd?: string;

  @ApiPropertyOptional({
    example: 'ERP',
    maxLength: 100,
    description: 'Origem do dado (ex: ERP, Planilha, Manual).',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({
    example: 'Ajuste de estorno Q3',
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
