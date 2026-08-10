import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
import { BUSINESS_TIMEZONE } from './period-resolver.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

// ── Tipos de resultado do ciclo ───────────────────────────────────────────────

/**
 * Resultado consolidado de um ciclo de fechamento automático.
 * Permite observabilidade sem expor dados sensíveis.
 */
export interface SchedulerCycleResult {
  /** Total de indicadores buscados (ativos, não-CUSTOM) */
  processed: number;
  /** Períodos fechados com sucesso neste ciclo */
  closed: number;
  /** Períodos já fechados anteriormente (idempotência) */
  alreadyClosed: number;
  /** Períodos encerrados sem medições válidas (SUM/AVG/MIN/MAX/LAST sem dados) */
  noData: number;
  /** Indicadores com aggregationType=FORMULA (aguardam Formula Engine) */
  formulaRequired: number;
  /** Períodos que ainda não terminaram */
  periodOpen: number;
  /** Indicadores ignorados (frequency=CUSTOM ou outros motivos) */
  skipped: number;
  /** Indicadores que falharam com erro inesperado */
  failed: number;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

/**
 * IndicatorPeriodClosingScheduler — automatização do fechamento de períodos.
 *
 * Executa periodicamente e, para cada indicador ativo (exceto CUSTOM/FORMULA),
 * delega para IndicatorPeriodApurationService.closePeriod() a verificação
 * e o fechamento do período encerrado.
 *
 * RESPONSABILIDADE ÚNICA: QUANDO verificar — não duplica lógica de cálculo.
 *
 * REGRAS DE ELEGIBILIDADE (apenas no scheduler):
 * - isActive === true → processa
 * - isActive === false → ignora (scheduler não fecha períodos de inativos)
 * - frequency === CUSTOM → ignora (sem resolução automática)
 *
 * IDEMPOTÊNCIA:
 * Confia inteiramente na constraint @@unique([indicatorId, periodStart, periodEnd])
 * e no retorno ALREADY_CLOSED do IndicatorPeriodApurationService.
 * Não cria tabela adicional de controle.
 *
 * CONCORRÊNCIA:
 * Proteção em memória via flag `_running` para evitar execuções sobrepostas
 * dentro da mesma instância. A idempotência do service garante a proteção
 * entre múltiplas instâncias (sem distributed lock, conforme decisão da etapa).
 *
 * FALHA DE UM INDICADOR:
 * Erros individuais são capturados e logados; o ciclo continua para os demais.
 *
 * TIMEZONE:
 * Utiliza BUSINESS_TIMEZONE (America/Sao_Paulo) do PeriodResolverService.
 * Não cria nova lógica temporal.
 */
@Injectable()
export class IndicatorPeriodClosingScheduler {
  private readonly logger = new Logger(IndicatorPeriodClosingScheduler.name);

  /** Proteção simples em memória contra execuções sobrepostas na mesma instância */
  private _running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apuration: IndicatorPeriodApurationService,
    private readonly backfill: IndicatorPeriodBackfillService,
  ) {}

  /**
   * Executa o ciclo de fechamento automático a cada minuto.
   *
   * Cronograma: '0 * * * * *' = início de cada minuto (segundos=0)
   * Timezone: America/Sao_Paulo (BUSINESS_TIMEZONE)
   *
   * Padrão seguido: mesmo formato de cron usado em IndicatorCronService.
   */
  @Cron('0 * * * * *', {
    name: 'indicator-period-closing',
    timeZone: BUSINESS_TIMEZONE,
  })
  async handleCron(): Promise<void> {
    await this.runCycle();
  }

  /**
   * Executa o ciclo de fechamento.
   * Pode ser chamado diretamente para testes determinísticos.
   *
   * @param referenceDate Data de referência (default: agora). Determinístico em testes.
   */
  async runCycle(
    referenceDate: Date = new Date(),
  ): Promise<SchedulerCycleResult> {
    // Proteção contra execuções sobrepostas dentro da mesma instância
    if (this._running) {
      this.logger.warn(
        '[IndicatorPeriodScheduler] Ciclo anterior ainda em andamento — pulando esta execução.',
      );
      return {
        processed: 0,
        closed: 0,
        alreadyClosed: 0,
        noData: 0,
        formulaRequired: 0,
        periodOpen: 0,
        skipped: 0,
        failed: 0,
      };
    }

    this._running = true;
    this.logger.log('[IndicatorPeriodScheduler] Starting period closing cycle');

    const result: SchedulerCycleResult = {
      processed: 0,
      closed: 0,
      alreadyClosed: 0,
      noData: 0,
      formulaRequired: 0,
      periodOpen: 0,
      skipped: 0,
      failed: 0,
    };

    try {
      // Busca apenas indicadores ATIVOS — scheduler não processa inativos
      // frequency != CUSTOM é filtrado na query para evitar chamadas desnecessárias
      const indicators = await this.prisma.indicator.findMany({
        where: {
          isActive: true,
          frequency: { not: IndicatorFrequency.CUSTOM },
        },
        select: {
          id: true,
          name: true,
          frequency: true,
          aggregationType: true,
        },
      });

      for (const indicator of indicators) {
        result.processed++;
        this.logger.log(
          `[IndicatorPeriodScheduler] Processing indicator ${indicator.id} (${indicator.name})`,
        );

        try {
          const apurationResult = await this.apuration.closePeriod(
            indicator.id,
            referenceDate,
            BUSINESS_TIMEZONE,
          );

          switch (apurationResult.status) {
            case 'CLOSED': {
              const r = apurationResult;
              result.closed++;
              this.logger.log(
                `[IndicatorPeriodScheduler] Period closed successfully`,
                {
                  indicatorId: r.indicatorId,
                  periodStart: r.periodStart,
                  periodEnd: r.periodEnd,
                  historyId: r.historyId,
                },
              );
              break;
            }
            case 'ALREADY_CLOSED': {
              const r = apurationResult;
              result.alreadyClosed++;
              this.logger.log(
                `[IndicatorPeriodScheduler] Period already closed`,
                {
                  indicatorId: r.indicatorId,
                  periodStart: r.periodStart,
                  periodEnd: r.periodEnd,
                },
              );
              break;
            }
            case 'NO_DATA': {
              const r = apurationResult;
              result.noData++;
              this.logger.log(
                `[IndicatorPeriodScheduler] Indicator skipped — no data`,
                { indicatorId: r.indicatorId, reason: 'NO_DATA' },
              );
              break;
            }
            case 'FORMULA_ENGINE_REQUIRED': {
              const r = apurationResult;
              result.formulaRequired++;
              this.logger.log(
                `[IndicatorPeriodScheduler] Indicator skipped — formula engine required`,
                {
                  indicatorId: r.indicatorId,
                  reason: 'FORMULA_ENGINE_REQUIRED',
                },
              );
              break;
            }
            case 'PERIOD_OPEN': {
              const r = apurationResult;
              result.periodOpen++;
              this.logger.debug(
                `[IndicatorPeriodScheduler] Period not yet closed`,
                { indicatorId: r.indicatorId, periodEnd: r.periodEnd },
              );
              break;
            }
            case 'CUSTOM_FREQUENCY_NOT_SUPPORTED': {
              result.skipped++;
              this.logger.log(
                `[IndicatorPeriodScheduler] Indicator skipped — CUSTOM frequency`,
                {
                  indicatorId: indicator.id,
                  reason: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
                },
              );
              break;
            }
            default: {
              // Exhaustiveness: não deve ocorrer
              result.skipped++;
              break;
            }
          }
        } catch (error) {
          result.failed++;
          this.logger.error(
            `[IndicatorPeriodScheduler] Failed to close period`,
            { indicatorId: indicator.id, error: String(error) },
          );
          // Continua processando os demais indicadores
        }
      }
      // Após fechar o período atual, executar backfill para recuperar
      // períodos anteriores que possam ter ficado pendentes (downtime, restart).
      // O backfill é idempotente: períodos já fechados retornam ALREADY_CLOSED.
      try {
        await this.backfill.runBackfill(referenceDate, BUSINESS_TIMEZONE);
      } catch (error) {
        this.logger.error(
          '[IndicatorPeriodScheduler] Backfill failed — continuing',
          { error: String(error) },
        );
      }
    } finally {
      this._running = false;
    }

    this.logger.log(
      '[IndicatorPeriodScheduler] Period closing cycle completed',
      result,
    );

    return result;
  }
}
