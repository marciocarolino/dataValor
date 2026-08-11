import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';

// ── Tipos de resultado ─────────────────────────────────────────────────────────

/** Resultado da auditoria de um único indicador */
export interface IndicatorAuditEntry {
  indicatorId: string;
  indicatorName: string;
  /** currentValue atual no banco (Decimal convertido para number | null) */
  currentValue: number | null;
  indicatorStatus: string;
  /** Se existe pelo menos um IndicatorHistory */
  hasHistory: boolean;
  /** ID do último IndicatorHistory (por periodEnd DESC) */
  latestHistoryId: string | null;
  /** value do último IndicatorHistory */
  latestHistoryValue: number | null;
  /** status do último IndicatorHistory */
  latestHistoryStatus: string | null;
  latestHistoryPeriodStart: Date | null;
  latestHistoryPeriodEnd: Date | null;
  /** true se currentValue ou status divergem do histórico */
  inconsistent: boolean;
}

/** Resultado agregado de uma execução de reconciliação */
export interface ReconciliationResult {
  total: number;
  consistent: number;
  corrected: number;
  withoutHistory: number;
  failed: number;
  entries: IndicatorAuditEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Converte um campo Decimal do Prisma (objeto com toNumber()) ou qualquer tipo
 * compatível em number | null.
 */
function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    const n = (v as { toNumber(): number }).toNumber();
    return isFinite(n) ? n : null;
  }
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : null;
}

/**
 * Compara dois valores Decimal de forma segura, tolerando as representações
 * possíveis (Decimal object, number, string).
 *
 * Usa igualdade numérica com tolerância de 1e-9 para evitar falsos positivos
 * por representação de ponto flutuante.
 */
function decimalsEqual(a: unknown, b: unknown): boolean {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;
  return Math.abs(na - nb) < 1e-9;
}

// ── Serviço ────────────────────────────────────────────────────────────────────

/**
 * IndicatorStateReconciliationService — auditoria e correção de consistência.
 *
 * RESPONSABILIDADE:
 * Garantir que Indicator.currentValue e Indicator.status reflitam exatamente
 * o último IndicatorHistory (por periodEnd DESC) de cada indicador.
 *
 * Existe para corrigir indicadores criados ANTES da ETAPA 3G, onde a
 * sincronização automática ainda não estava implementada.
 *
 * REGRAS:
 * - "Último histórico" = IndicatorHistory com maior periodEnd.
 * - Atualiza SOMENTE Indicator.currentValue e Indicator.status.
 * - Não altera nenhum IndicatorHistory.
 * - Não cria nenhum IndicatorHistory.
 * - Não recalcula status nem value.
 * - Idempotente: segunda execução produz corrected=0.
 * - Falha em um indicador não interrompe os demais.
 * - Indicador sem histórico: não é alterado.
 * - value=null no histórico: sincroniza null (não trata como 0).
 */
@Injectable()
export class IndicatorStateReconciliationService {
  private readonly logger = new Logger(
    IndicatorStateReconciliationService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly currentStateService: IndicatorCurrentStateService,
  ) {}

  /**
   * Audita e corrige todos os indicadores.
   *
   * @returns Relatório com contadores e entradas de auditoria.
   */
  async reconcileAll(): Promise<ReconciliationResult> {
    this.logger.log(
      '[Reconciliation] Starting state reconciliation for all indicators',
    );

    const indicators = await this.prisma.indicator.findMany({
      select: {
        id: true,
        name: true,
        currentValue: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const result: ReconciliationResult = {
      total: indicators.length,
      consistent: 0,
      corrected: 0,
      withoutHistory: 0,
      failed: 0,
      entries: [],
    };

    for (const ind of indicators) {
      try {
        const entry = await this.reconcileOne(
          ind.id,
          ind.name,
          ind.currentValue,
          ind.status,
        );
        result.entries.push(entry);

        if (!entry.hasHistory) {
          result.withoutHistory++;
        } else if (!entry.inconsistent) {
          result.consistent++;
        } else {
          result.corrected++;
        }
      } catch (err) {
        result.failed++;
        this.logger.error(
          `[Reconciliation] Failed to reconcile indicator ${ind.id} (${ind.name})`,
          err instanceof Error ? err.stack : String(err),
        );
        result.entries.push({
          indicatorId: ind.id,
          indicatorName: ind.name,
          currentValue: toNumber(ind.currentValue),
          indicatorStatus: ind.status,
          hasHistory: false,
          latestHistoryId: null,
          latestHistoryValue: null,
          latestHistoryStatus: null,
          latestHistoryPeriodStart: null,
          latestHistoryPeriodEnd: null,
          inconsistent: false,
        });
      }
    }

    this.logger.log(
      `[Reconciliation] Completed: total=${result.total} consistent=${result.consistent} ` +
        `corrected=${result.corrected} withoutHistory=${result.withoutHistory} failed=${result.failed}`,
    );

    return result;
  }

  /**
   * Audita e (se necessário) corrige um único indicador.
   *
   * @internal Chamado por reconcileAll(); pode ser chamado individualmente em testes.
   */
  async reconcileOne(
    indicatorId: string,
    indicatorName: string,
    rawCurrentValue: unknown,
    rawStatus: unknown,
  ): Promise<IndicatorAuditEntry> {
    // Busca o último IndicatorHistory por periodEnd DESC
    const latest = await this.prisma.indicatorHistory.findFirst({
      where: { indicatorId },
      orderBy: [
        { periodEnd: 'desc' },
        { calculatedAt: 'desc' }, // desempate determinístico
      ],
      select: {
        id: true,
        value: true,
        status: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    const currentValue = toNumber(rawCurrentValue);
    const indicatorStatus =
      typeof rawStatus === 'string' ? rawStatus : 'NEUTRAL';

    if (!latest) {
      // Indicador sem histórico — não alterar
      return {
        indicatorId,
        indicatorName,
        currentValue,
        indicatorStatus,
        hasHistory: false,
        latestHistoryId: null,
        latestHistoryValue: null,
        latestHistoryStatus: null,
        latestHistoryPeriodStart: null,
        latestHistoryPeriodEnd: null,
        inconsistent: false,
      };
    }

    const latestValue = toNumber(latest.value);
    const latestStatus = latest.status as string;

    const valueConsistent = decimalsEqual(rawCurrentValue, latest.value);
    const statusConsistent = indicatorStatus === latestStatus;
    const inconsistent = !valueConsistent || !statusConsistent;

    if (inconsistent) {
      this.logger.log(
        `[Reconciliation] Inconsistency found — indicator ${indicatorId} (${indicatorName}): ` +
          `currentValue=${String(currentValue)} → ${String(latestValue)}, ` +
          `status=${indicatorStatus} → ${latestStatus}`,
      );

      // Reutiliza IndicatorCurrentStateService para garantir a mesma regra
      // de sincronização já validada e testada
      await this.currentStateService.syncFromHistory(indicatorId, {
        value: latestValue,
        status: latestStatus,
      });
    }

    return {
      indicatorId,
      indicatorName,
      currentValue,
      indicatorStatus,
      hasHistory: true,
      latestHistoryId: latest.id,
      latestHistoryValue: latestValue,
      latestHistoryStatus: latestStatus,
      latestHistoryPeriodStart: latest.periodStart,
      latestHistoryPeriodEnd: latest.periodEnd,
      inconsistent,
    };
  }
}
