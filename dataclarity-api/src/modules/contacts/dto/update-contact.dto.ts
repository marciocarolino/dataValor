import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContactStatus } from '../enums/contact-status.enum';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class UpdateContactDto {
  @ApiPropertyOptional({
    example: 'João da Silva',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com', maxLength: 254 })
  @IsOptional()
  @IsEmail()
  @Transform(trim)
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: '61999999999', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Empresa XPTO', maxLength: 150 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(150)
  company?: string;

  @ApiPropertyOptional({ example: 'Automação de relatórios', maxLength: 150 })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(150)
  subject?: string;

  @ApiPropertyOptional({
    example: 'Preciso automatizar meus relatórios mensais.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MinLength(10)
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({
    enum: ContactStatus,
    example: ContactStatus.CONTACTED,
  })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
