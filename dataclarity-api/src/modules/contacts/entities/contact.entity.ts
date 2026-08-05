import { ApiProperty } from '@nestjs/swagger';
import { ContactStatus } from '../enums/contact-status.enum';

export class ContactEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ example: '61999999999', required: false, nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'Empresa XPTO', required: false, nullable: true })
  company!: string | null;

  @ApiProperty({
    example: 'Automação de relatórios',
    required: false,
    nullable: true,
  })
  subject!: string | null;

  @ApiProperty({ example: 'Preciso automatizar meus relatórios mensais.' })
  message!: string;

  @ApiProperty({ enum: ContactStatus, example: ContactStatus.NEW })
  status!: ContactStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
