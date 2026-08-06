import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { envSchema } from '../../config/env.schema';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly env = envSchema.parse(process.env);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: this.env.SMTP_HOST,
      port: this.env.SMTP_PORT,
      secure: this.env.SMTP_SECURE,
      auth:
        this.env.SMTP_USER && this.env.SMTP_PASS
          ? { user: this.env.SMTP_USER, pass: this.env.SMTP_PASS }
          : undefined,
    });
  }

  async sendEmailVerification(
    to: string,
    token: string,
    name?: string | null,
  ): Promise<void> {
    const verifyUrl = `${this.env.FRONTEND_URL}/verify-email?token=${token}`;
    const displayName = name ?? to;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Confirme seu e-mail — DataClarity</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #d5dde3;padding:40px 40px 48px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18b6c9;letter-spacing:.04em;text-transform:uppercase;">DataClarity</p>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#091017;letter-spacing:-.02em;">Confirme seu e-mail</h1>
                    <p style="margin:0 0 28px;font-size:14px;color:#66727e;">Olá, ${displayName}! Clique no botão abaixo para ativar sua conta.</p>
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:#18b6c9;color:#ffffff;font-size:15px;font-weight:600;
                              padding:14px 32px;border-radius:10px;text-decoration:none;margin-bottom:28px;">
                      Verificar meu e-mail
                    </a>
                    <p style="margin:0 0 8px;font-size:13px;color:#66727e;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin:0 0 28px;font-size:12px;color:#18b6c9;word-break:break-all;">${verifyUrl}</p>
                    <p style="margin:0;font-size:12px;color:#7b8792;">
                      Este link expira em <strong>72 horas</strong>. Se você não criou uma conta no DataClarity, ignore este e-mail.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `Olá, ${displayName}!\n\nClique no link abaixo para verificar seu e-mail e ativar sua conta DataClarity:\n\n${verifyUrl}\n\nEste link expira em 72 horas.`;

    try {
      const info: { messageId?: string } = await this.transporter.sendMail({
        from: this.env.SMTP_FROM,
        to,
        subject: 'Confirme seu e-mail — DataClarity',
        text,
        html,
      });

      this.logger.log(
        `E-mail de verificação enviado para ${to} [${info.messageId ?? 'sem-id'}]`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Falha ao enviar e-mail de verificação para ${to}`,
        err instanceof Error ? err.message : String(err),
      );
      // Não lança exceção — o registro do usuário não deve falhar por erro de e-mail
    }
  }
}
