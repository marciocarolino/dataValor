import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Serviço de cron para atualização automática dos dias restantes de cada indicador.
 *
 * Executa 3 vezes ao dia: 06:00, 13:00 e 20:00 (horário de Brasília, UTC-3).
 * Para cada indicador com endDate definido, recalcula daysRemaining como:
 *   floor((endDate - hoje) / 86400000)
 * Valores negativos indicam que o prazo já foi encerrado.
 */
@Injectable()
export class IndicatorCronService {
  private readonly logger = new Logger(IndicatorCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── 06:00 BRT (09:00 UTC) ──────────────────────────────────────────────────
  @Cron('0 9 * * *', {
    name: 'indicator-days-morning',
    timeZone: 'America/Sao_Paulo',
  })
  async handleMorning(): Promise<void> {
    this.logger.log(
      '[CRON 06:00] Atualizando dias restantes dos indicadores...',
    );
    await this.recalcDaysRemaining();
  }

  // ── 13:00 BRT (16:00 UTC) ──────────────────────────────────────────────────
  @Cron('0 16 * * *', {
    name: 'indicator-days-afternoon',
    timeZone: 'America/Sao_Paulo',
  })
  async handleAfternoon(): Promise<void> {
    this.logger.log(
      '[CRON 13:00] Atualizando dias restantes dos indicadores...',
    );
    await this.recalcDaysRemaining();
  }

  // ── 20:00 BRT (23:00 UTC) ──────────────────────────────────────────────────
  @Cron('0 23 * * *', {
    name: 'indicator-days-evening',
    timeZone: 'America/Sao_Paulo',
  })
  async handleEvening(): Promise<void> {
    this.logger.log(
      '[CRON 20:00] Atualizando dias restantes dos indicadores...',
    );
    await this.recalcDaysRemaining();
  }

  /**
   * Calcula e persiste `daysRemaining` para todos os indicadores com `endDate`.
   * - Indicadores sem `endDate` ficam com `daysRemaining = null`.
   * - Valor negativo significa prazo encerrado.
   */
  async recalcDaysRemaining(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca todos os indicadores ativos com endDate definido
    const indicators = await this.prisma.indicator.findMany({
      where: { endDate: { not: null } },
      select: { id: true, endDate: true, name: true },
    });

    let updated = 0;

    for (const ind of indicators) {
      const end = new Date(ind.endDate!);
      end.setHours(0, 0, 0, 0);
      const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);

      await this.prisma.indicator.update({
        where: { id: ind.id },
        data: { daysRemaining: days },
      });
      updated++;
    }

    // Zera os que não têm endDate
    await this.prisma.indicator.updateMany({
      where: { endDate: null },
      data: { daysRemaining: null },
    });

    this.logger.log(`[CRON] ${updated} indicadores atualizados.`);
  }
}
