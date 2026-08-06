import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    description:
      'Mensagem de sucesso informando que o e-mail de verificação foi enviado',
    example: 'Cadastro realizado! Verifique seu e-mail para ativar sua conta.',
  })
  message!: string;
}
