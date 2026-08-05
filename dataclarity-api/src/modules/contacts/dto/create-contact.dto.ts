import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateContactDto {
  @ApiProperty({ example: 'João da Silva', minLength: 2, maxLength: 120 })
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'joao@email.com', maxLength: 254 })
  @IsEmail()
  @Transform(trim)
  @MaxLength(254)
  email!: string;

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

  @ApiProperty({
    example: 'Preciso automatizar meus relatórios mensais.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @Transform(trim)
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}
