import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorStatus } from './enums/indicator-status.enum';

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Input mínimo para sincronização.
 * Compatível com IndicatorHistoryRecord.
 */
export interface HistorySyncInput {
  /** Valor apurado do período. null = sem valor (SUM/AVG/MIN/MAX/LAST sem dados). 0 = COUNT sem medições. */
  value: unknown;
  /** Status já calculado pelo IndicatorAnalyticsService durante a apuração. */
  status: string;
}

/** Resultado da sincronização. */
export interface CurrentStateSyncResult {
  /** ID do indicador atualizado. */
  indicatorId: string;
  /** Valor gravado em Indicator.currentValue. */
  currentValue: unknown;
  /** Status gravado em Indicator.status. */
  status: IndicatorStatus;
  /** true = update executado; false = não executado (history ou indicator ausente). */
  synced: boolean;
}

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * IndicatorCurrentStateService — sincroniza o estado corrente do Indicator
 * a partir do IndicatorHistory mais recente.
 *
 * RESPONSABILIDADE EXCLUSIVA:
 *   IndicatorHistory.value  → Indicator.currentValue
 *   IndicatorHistory.status → Indicator.status
 *
 * REGRAS INVIOLÁVEIS:
 *   1. Atualiza SOMENTE currentValue e status. Nenhum outro campo.
 *   2. Não recalcula status — usa diretamente o já calculado no histórico.
 *   3. Não recalcula fórmula, aggregation, previousValue, variation.
 *   4. Só executa se IndicatorHistory existir e Indicator existir.
 *   5. value = null permanece null. Não converte para 0 ou para previousValue.
 *   6. value = 0 (COUNT sem medições) é persistido como 0 — é um valor semântico.
 *
 * PAYLOAD EXATO do prisma.indicator.update:
 *   data: { currentValue: history.value ?? null, status: history.status }
 *
 * NÃO usa: `data: indicator`, `data: { ...indicator }` ou qualquer spread.
 */
@Injectable()
export class IndicatorCurrentStateService {
  private readonly logger = new Logger(IndicatorCurrentStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sincroniza currentValue e status do Indicator a partir do histórico fechado.
   *
   * Chamado SOMENTE após IndicatorHistory.create() bem-sucedido.
   *
   * @param indicatorId  ID do indicador a ser atualizado
   * @param history      Registro do IndicatorHistory recém-criado
   * @returns            Resultado da sincronização
   */
  async syncFromHistory(
    indicatorId: string,
    history: HistorySyncInput,
  ): Promise<CurrentStateSyncResult> {
    // Verificar que o indicador existe antes de atualizar
    const exists = await this.prisma.indicator.findUnique({
      where: { id: indicatorId },
      select: { id: true },
    });

    if (!exists) {
      this.logger.warn(
        `[CurrentStateSync] Indicador ${indicatorId} não encontrado — sync ignorado.`,
      );
      return {
        indicatorId,
        currentValue: null,
        status: IndicatorStatus.NEUTRAL,
        synced: false,
      };
    }

    // Converte o status string para o enum tipado
    const status = history.status as IndicatorStatus;

    // Converte value para number | null (null permanece null, 0 permanece 0)
    const currentValue = this.toCurrentValue(history.value);

    // PAYLOAD EXATO: SOMENTE currentValue e status — nenhum outro campo
    await this.prisma.indicator.update({
      where: { id: indicatorId },
      data: {
        currentValue,
        status,
      },
    });

    this.logger.log(
      `[CurrentStateSync] Indicator ${indicatorId} sincronizado: currentValue=${String(currentValue)}, status=${status}`,
    );

    return {
      indicatorId,
      currentValue,
      status,
      synced: true,
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Converte o value do IndicatorHistory para number | null.
   *
   * Regras:
   *   - null/undefined → null (preservado, NÃO convertido para 0)
   *   - 0 → 0 (COUNT sem medições — valor semântico válido)
   *   - Decimal-like { toNumber() } → number
   *   - number → number
   *   - string numérica → number
   *   - NaN/Infinity → null (protege contra valores inválidos)
   */
  private toCurrentValue(value: unknown): number | null {
    if (value == null) return null;

    let n: number;

    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      n = (value as { toNumber(): number }).toNumber();
    } else {
      n = Number(value);
    }

    if (!isFinite(n) || isNaN(n)) return null;
    return n;
  }
}
