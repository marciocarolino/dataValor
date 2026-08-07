import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteDatasetDto {
  @ApiProperty({
    example: 'Receita',
    description: 'Nome/label da série de dados.',
  })
  label!: string;

  @ApiProperty({
    type: [Number],
    example: [120000, 150000, 170000],
    description: 'Valores numéricos da série, na mesma ordem dos labels.',
  })
  data!: number[];
}

export class ExecuteSummaryDto {
  @ApiProperty({ example: 440000, description: 'Soma total dos valores.' })
  total!: number;

  @ApiPropertyOptional({
    example: 13.2,
    nullable: true,
    description: 'Percentual de crescimento em relação ao período anterior.',
  })
  growth!: number | null;

  @ApiProperty({
    example: 3,
    description: 'Quantidade de registros retornados.',
  })
  records!: number;
}

export class ExecuteAnalysisResultDto {
  @ApiProperty({
    example: 'Receita Mensal',
    description: 'Título da análise executada.',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'Receita por mês',
    nullable: true,
    description: 'Descrição da análise.',
  })
  description!: string | null;

  @ApiProperty({
    example: 'LINE',
    description:
      'Tipo de gráfico — define como o frontend deve renderizar os dados.',
  })
  chartType!: string;

  @ApiProperty({
    type: [String],
    example: ['Jan', 'Fev', 'Mar'],
    description: 'Eixo X ou categorias da visualização.',
  })
  labels!: string[];

  @ApiProperty({
    type: [ExecuteDatasetDto],
    description: 'Séries de dados para o gráfico.',
  })
  datasets!: ExecuteDatasetDto[];

  @ApiProperty({
    type: ExecuteSummaryDto,
    description: 'Resumo estatístico da execução.',
  })
  summary!: ExecuteSummaryDto;
}
