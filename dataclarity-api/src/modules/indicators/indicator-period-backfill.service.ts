import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PeriodResolverService,
  isPeriodResolution,
  BUSINESS_TIMEZONE,
} from './period-resolver.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

// ── Tipos de resultado ────────────────────────────────────────────────────────

/** Resultado do backfill de um único indicador. */
export interface BackfillIndicatorResult {
  indicatorId: string;
  /** Períodos identificados como pendentes (sem IndicatorHistory). */
  periodsFound: number;
  /** Períodos efetivamente processados (≤ periodsFound, limitado por MAX_PERIODS). */
  processed: number;
  closed: number;
  alreadyClosed: number;
  noData: number;
  formulaRequired: number;
  /** Períodos onde o fechamento falhou com erro inesperado. */
  failed: number;
  /** true = o processamento foi interrompido por um erro (estratégia: parar por indicador). */
  aborted: boolean;
  firstPeriodStart: Date | null;
  lastPeriodEnd: Date | null;
}

/** Resultado de um ciclo completo de backfill. */
export interface BackfillCycleResult {
  indicatorsProcessed: number;
  indicatorsSkipped: number;
  totalPeriodsFound: number;
  totalClosed: number;
  totalAlreadyClosed: number;
  totalNoData: number;
  totalFormulaRequired: number;
  totalFailed: number;
  indicatorsAborted: number;
}

// ── Constantes ────────────────────────────────────────────────────────────────

/**
 * Limite máximo de períodos processados por indicador por execução do backfill.
 *
 * Justificativa: evita loops potencialmente infinitos e limita o tempo de
 * execução de um ciclo. Um indicador com >100 períodos pendentes indica
 * situação anormal (downtime prolongado ou bug de configuração).
 * O próxima execução continuará de onde parou (idempotência via ALREADY_CLOSED).
 */
export const MAX_PERIODS_PER_INDICATOR = 100;

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * IndicatorPeriodBackfillService — recuperação automática de períodos pendentes.
 *
 * Responsabilidade: dado um indicador e uma data de referência, identificar
 * quais períodos de apuração não possuem IndicatorHistory e solicitar o
 * fechamento deles via IndicatorPeriodApurationService, em ordem cronológica.
 *
 * ESTRATÉGIAS DOCUMENTADAS:
 *
 * 1. ORIGEM DO BACKFILL:
 *    Utiliza `Indicator.createdAt` como ponto de partida.
 *    Razão: não tentamos fechar períodos antes da existência do indicador.
 *    `createdAt` é o campo mais seguro e já existe no schema (sem migration).
 *
 * 2. ITERAÇÃO DE PERÍODOS:
 *    Usa `PeriodResolverService.resolve(frequency, currentRef)` para descobrir
 *    cada período. Avança usando `period.periodEnd` como próximo `referenceDate`.
 *    NÃO duplica lógica temporal.
 *
 * 3. VERIFICAÇÃO DE PENDÊNCIA:
 *    Busca em batch todos os `IndicatorHistory.periodStart` do indicador
 *    numa única query, construindo um Set para lookup O(1).
 *    Evita N+1 queries de verificação por período.
 *
 * 4. ORDEM CRONOLÓGICA:
 *    Períodos são processados do mais antigo ao mais recente.
 *    Isso garante que `previousValue` de cada período reflita o período
 *    imediatamente anterior (recém-fechado).
 *
 * 5. ESTRATÉGIA DE FALHA:
 *    Um erro em qualquer período INTERROMPE o processamento do indicador.
 *    Razão: `previousValue` depende do período anterior. Se um período falha,
 *    processar os seguintes geraria previousValues incorretos.
 *    O scheduler marcará o indicador como `aborted`.
 *    Na próxima execução, a idempotência (ALREADY_CLOSED) protege os períodos
 *    já fechados e o processamento recomeça do ponto de falha.
 *
 * 6. IDEMPOTÊNCIA:
 *    `closePeriod()` retorna ALREADY_CLOSED se o histórico já existe.
 *    A constraint @@unique([indicatorId, periodStart, periodEnd]) é a
 *    segunda linha de defesa.
 *
 * 7. LIMITE DE SEGURANÇA:
 *    MAX_PERIODS_PER_INDICATOR = 100 por execução.
 *    Indica situação anormal se ultrapassado. A próxima execução continua.
 *
 * 8. CUSTOM:
 *    Indicadores com frequency=CUSTOM são ignorados (sem período automático).
 *
 * 9. INATIVOS:
 *    O backfill por padrão segue a mesma regra do scheduler: somente isActive=true.
 *    O serviço aceita um parâmetro `includeInactive` para uso explícito (ex: scripts).
 *
 * 10. SCHEMA:
 *     Nenhuma migration necessária. `Indicator.createdAt` e `IndicatorHistory`
 *     já existem no schema.
 */
@Injectable()
export class IndicatorPeriodBackfillService {
  private readonly logger = new Logger(IndicatorPeriodBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periodResolver: PeriodResolverService,
    private readonly apuration: IndicatorPeriodApurationService,
  ) {}

  // ── API pública ─────────────────────────────────────────────────────────────

  /**
   * Executa o backfill de todos os indicadores elegíveis.
   *
   * @param referenceDate  Data de referência (default: agora). Determinístico em testes.
   * @param timezone       Timezone de negócio (default: America/Sao_Paulo)
   * @param includeInactive Se true, processa também indicadores inativos. Default: false.
   */
  async runBackfill(
    referenceDate: Date = new Date(),
    timezone: string = BUSINESS_TIMEZONE,
    includeInactive = false,
  ): Promise<BackfillCycleResult> {
    this.logger.log('[BackfillService] Starting backfill cycle', {
      referenceDate,
      timezone,
      includeInactive,
    });

    const cycle: BackfillCycleResult = {
      indicatorsProcessed: 0,
      indicatorsSkipped: 0,
      totalPeriodsFound: 0,
      totalClosed: 0,
      totalAlreadyClosed: 0,
      totalNoData: 0,
      totalFormulaRequired: 0,
      totalFailed: 0,
      indicatorsAborted: 0,
    };

    // Busca indicadores elegíveis
    const indicators = await this.prisma.indicator.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        frequency: { not: IndicatorFrequency.CUSTOM },
      },
      select: {
        id: true,
        frequency: true,
        createdAt: true,
        name: true,
      },
    });

    for (const indicator of indicators) {
      cycle.indicatorsProcessed++;
      this.logger.log(
        `[BackfillService] Processing indicator ${indicator.id} (${indicator.name})`,
      );

      try {
        const result = await this.backfillIndicator(
          indicator.id,
          indicator.frequency as IndicatorFrequency,
          indicator.createdAt,
          referenceDate,
          timezone,
        );

        cycle.totalPeriodsFound += result.periodsFound;
        cycle.totalClosed += result.closed;
        cycle.totalAlreadyClosed += result.alreadyClosed;
        cycle.totalNoData += result.noData;
        cycle.totalFormulaRequired += result.formulaRequired;
        cycle.totalFailed += result.failed;
        if (result.aborted) cycle.indicatorsAborted++;
      } catch (error) {
        cycle.indicatorsSkipped++;
        this.logger.error(
          `[BackfillService] Failed to backfill indicator ${indicator.id}`,
          {
            indicatorId: indicator.id,
            error: String(error),
          },
        );
      }
    }

    this.logger.log('[BackfillService] Backfill cycle completed', cycle);
    return cycle;
  }

  /**
   * Executa o backfill de um único indicador.
   * Pode ser chamado diretamente para recuperação manual de um indicador específico.
   *
   * @param indicatorId   ID do indicador
   * @param frequency     Frequência do indicador
   * @param startFrom     Data de início do backfill (default: Indicator.createdAt)
   * @param referenceDate Data final do backfill (default: agora)
   * @param timezone      Timezone de negócio
   */
  async backfillIndicator(
    indicatorId: string,
    frequency: IndicatorFrequency,
    startFrom: Date,
    referenceDate: Date = new Date(),
    timezone: string = BUSINESS_TIMEZONE,
  ): Promise<BackfillIndicatorResult> {
    const result: BackfillIndicatorResult = {
      indicatorId,
      periodsFound: 0,
      processed: 0,
      closed: 0,
      alreadyClosed: 0,
      noData: 0,
      formulaRequired: 0,
      failed: 0,
      aborted: false,
      firstPeriodStart: null,
      lastPeriodEnd: null,
    };

    // CUSTOM não possui períodos automáticos
    if (frequency === IndicatorFrequency.CUSTOM) {
      this.logger.log(
        `[BackfillService] Indicator skipped — CUSTOM frequency`,
        {
          indicatorId,
          reason: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
        },
      );
      return result;
    }

    // Descobrir todos os períodos pendentes
    const pendingPeriods = await this.findPendingPeriods(
      indicatorId,
      frequency,
      startFrom,
      referenceDate,
      timezone,
    );

    result.periodsFound = pendingPeriods.length;

    if (pendingPeriods.length === 0) {
      this.logger.debug(
        `[BackfillService] No pending periods for indicator ${indicatorId}`,
      );
      return result;
    }

    this.logger.log(
      `[BackfillService] Found ${pendingPeriods.length} pending periods for ${indicatorId}`,
      {
        indicatorId,
        periodsFound: pendingPeriods.length,
        firstPeriod: pendingPeriods[0]?.periodEnd,
        lastPeriod: pendingPeriods[pendingPeriods.length - 1]?.periodEnd,
      },
    );

    result.firstPeriodStart = pendingPeriods[0]?.periodStart ?? null;
    result.lastPeriodEnd =
      pendingPeriods[pendingPeriods.length - 1]?.periodEnd ?? null;

    // Processar em ordem cronológica (mais antigo → mais recente)
    // ESTRATÉGIA DE FALHA: interromper por indicador em caso de erro,
    // pois previousValue depende do período anterior.
    for (const period of pendingPeriods) {
      if (result.processed >= MAX_PERIODS_PER_INDICATOR) {
        this.logger.warn(
          `[BackfillService] Max periods reached for indicator ${indicatorId}`,
          {
            indicatorId,
            maxPeriods: MAX_PERIODS_PER_INDICATOR,
            periodsFound: pendingPeriods.length,
          },
        );
        break;
      }

      result.processed++;

      try {
        // closePeriod usa period.periodEnd como referenceDate (garante isClosed=true)
        const apurationResult = await this.apuration.closePeriod(
          indicatorId,
          period.periodEnd,
          timezone,
        );

        switch (apurationResult.status) {
          case 'CLOSED':
            result.closed++;
            this.logger.log(`[BackfillService] Period closed`, {
              indicatorId,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            });
            break;
          case 'ALREADY_CLOSED':
            result.alreadyClosed++;
            break;
          case 'NO_DATA':
            result.noData++;
            break;
          case 'FORMULA_ENGINE_REQUIRED':
            result.formulaRequired++;
            break;
          case 'PERIOD_OPEN':
            // Não deveria ocorrer pois period.periodEnd <= referenceDate
            this.logger.warn(
              `[BackfillService] Unexpected PERIOD_OPEN during backfill`,
              {
                indicatorId,
                periodEnd: period.periodEnd,
                referenceDate,
              },
            );
            break;
          default:
            result.noData++;
            break;
        }
      } catch (error) {
        result.failed++;
        result.aborted = true;
        this.logger.error(
          `[BackfillService] Error closing period — aborting backfill for indicator`,
          {
            indicatorId,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            error: String(error),
          },
        );
        // Interrompe o processamento deste indicador para preservar a cadeia de previousValue
        break;
      }
    }

    return result;
  }

  // ── Método interno: descoberta de períodos pendentes ──────────────────────

  /**
   * Descobre todos os períodos entre `startFrom` e `referenceDate` que não
   * possuem IndicatorHistory, em ordem cronológica.
   *
   * OTIMIZAÇÃO: busca todos os IndicatorHistory existentes em UMA ÚNICA query
   * (não N+1), construindo um Set de periodStart para lookup O(1).
   *
   * ALGORITMO:
   * 1. Carrega todos os periodStart dos IndicatorHistory do indicador
   * 2. Itera os períodos de startFrom até referenceDate usando PeriodResolverService
   * 3. Coleta os que não estão no Set (pendentes)
   */
  async findPendingPeriods(
    indicatorId: string,
    frequency: IndicatorFrequency,
    startFrom: Date,
    referenceDate: Date,
    timezone: string = BUSINESS_TIMEZONE,
  ): Promise<Array<{ periodStart: Date; periodEnd: Date }>> {
    // 1. Carregar todos os históricos existentes em uma única query
    const existingHistories = await this.prisma.indicatorHistory.findMany({
      where: { indicatorId },
      select: { periodStart: true },
    });

    // Set de chaves para lookup O(1) — usa toISOString() como chave
    const closedPeriodKeys = new Set(
      existingHistories.map((h) => h.periodStart.toISOString()),
    );

    // 2. Iterar períodos de startFrom até referenceDate
    const pending: Array<{ periodStart: Date; periodEnd: Date }> = [];
    let currentRef = startFrom;
    let safetyCounter = 0;
    const SAFETY_LIMIT = 1000; // segurança interna do loop de descoberta

    while (safetyCounter < SAFETY_LIMIT) {
      safetyCounter++;

      const resolution = this.periodResolver.resolve(
        frequency,
        currentRef,
        timezone,
      );

      // CUSTOM nunca deveria chegar aqui (verificado antes), mas por segurança:
      if (!isPeriodResolution(resolution)) break;

      const { periodStart, periodEnd } = resolution;

      // Se o período ainda não terminou, paramos
      if (periodEnd.getTime() > referenceDate.getTime()) break;

      // Verifica se este período já foi fechado
      const key = periodStart.toISOString();
      if (!closedPeriodKeys.has(key)) {
        pending.push({ periodStart, periodEnd });
      }

      // Avança ao próximo período usando periodEnd como nova referência
      currentRef = periodEnd;
    }

    return pending;
  }
}
