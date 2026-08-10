import { Injectable } from '@nestjs/common';
import { AggregationType } from './enums/aggregation-type.enum';

// ── Tipos de entrada ───────────────────────────────────────────────────────────

/**
 * Medição pontual usada como input do motor de agregação.
 * Duck-type compatível com IndicatorMeasurement do Prisma e com MeasurementRaw
 * já usado pelo IndicatorAnalyticsService.
 */
export interface MeasurementInput {
  /** Valor numérico da medição. Aceita Decimal-like do Prisma ou número puro. */
  value: DecimalLike;
  /** Data de referência da medição — usada para filtrar pelo período e para LAST. */
  referenceDate: Date;
}

/** Duck-type para Decimal do Prisma (evita import do runtime interno). */
type DecimalLike = { toNumber(): number } | number | string | null | undefined;

/** Parâmetros mínimos do indicador necessários para a agregação. */
export interface IndicatorAggregationInput {
  aggregationType: AggregationType;
  /** formula: armazenada como dado declarativo — NUNCA é executada. */
  formula?: string | null;
}

// ── Tipos de saída ─────────────────────────────────────────────────────────────

/**
 * Resultado de agregação para tipos SUM/AVG/MIN/MAX/LAST/COUNT.
 * value pode ser null quando não há medições válidas (AVG/MIN/MAX/LAST sem dados).
 */
export interface AggregationResult {
  aggregationType: AggregationType;
  /** Valor agregado. null = sem medições válidas (exceto COUNT que retorna 0). */
  value: number | null;
  /** Quantidade de medições válidas usadas no cálculo. */
  measurementCount: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Resultado específico para aggregationType = FORMULA.
 * NÃO executa a fórmula — aguarda o futuro Formula Engine.
 */
export interface FormulaAggregationResult {
  aggregationType: AggregationType.FORMULA;
  value: null;
  measurementCount: number;
  periodStart: Date;
  periodEnd: Date;
  requiresFormulaEngine: true;
  /** Conteúdo declarativo da fórmula — nunca executado. */
  formula: string | null;
}

export type AggregationEngineResult =
  AggregationResult | FormulaAggregationResult;

/** Guard de tipo: verifica se o resultado é do tipo FORMULA */
export function isFormulaResult(
  r: AggregationEngineResult,
): r is FormulaAggregationResult {
  return r.aggregationType === AggregationType.FORMULA;
}

// ── Serviço ────────────────────────────────────────────────────────────────────

/**
 * AggregationEngineService — motor de agregação de medições por período.
 *
 * Responsabilidade EXCLUSIVA: dado um indicador, um período [periodStart, periodEnd)
 * e uma lista de medições, calcular o valor consolidado do período de acordo com
 * o aggregationType do indicador.
 *
 * Fronteira do período: [periodStart, periodEnd) — periodEnd exclusivo.
 * Medição válida: valor numérico finito + referenceDate dentro do período.
 *
 * NÃO cria IndicatorHistory.
 * NÃO executa fórmulas (aggregationType = FORMULA retorna requiresFormulaEngine: true).
 * NÃO altera Indicator.status ou Indicator.isActive.
 * NÃO recalcula periodStart/periodEnd (recebe como argumento).
 * NÃO depende do PrismaService — pode ser instanciado com `new`.
 */
@Injectable()
export class AggregationEngineService {
  /**
   * Calcula o valor consolidado das medições para um período.
   *
   * @param indicator  Parâmetros do indicador (aggregationType + formula)
   * @param periodStart  Início inclusivo do período (fronteira [)
   * @param periodEnd    Fim exclusivo do período (fronteira ))
   * @param measurements  Todas as medições do indicador (filtro interno por período)
   */
  aggregate(
    indicator: IndicatorAggregationInput,
    periodStart: Date,
    periodEnd: Date,
    measurements: MeasurementInput[],
  ): AggregationEngineResult {
    // FORMULA: não executa — aguarda Formula Engine
    if (indicator.aggregationType === AggregationType.FORMULA) {
      const valid = this.filterAndConvert(measurements, periodStart, periodEnd);
      return {
        aggregationType: AggregationType.FORMULA,
        value: null,
        measurementCount: valid.length,
        periodStart,
        periodEnd,
        requiresFormulaEngine: true,
        formula: indicator.formula ?? null,
      };
    }

    const valid = this.filterAndConvert(measurements, periodStart, periodEnd);
    const value = this.compute(indicator.aggregationType, valid);

    return {
      aggregationType: indicator.aggregationType,
      value,
      measurementCount: valid.length,
      periodStart,
      periodEnd,
    };
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  /**
   * Filtra medições dentro do período [periodStart, periodEnd) e converte
   * DecimalLike para number. Descarta valores não numéricos/não finitos.
   * NÃO muta as medições de entrada.
   */
  private filterAndConvert(
    measurements: MeasurementInput[],
    periodStart: Date,
    periodEnd: Date,
  ): { value: number; referenceDate: Date }[] {
    const startMs = periodStart.getTime();
    const endMs = periodEnd.getTime();

    const result: { value: number; referenceDate: Date }[] = [];

    for (const m of measurements) {
      const refMs = m.referenceDate.getTime();
      // Fronteira [periodStart, periodEnd) — periodEnd exclusivo
      if (refMs < startMs || refMs >= endMs) continue;

      const num = this.toNumber(m.value);
      if (num === null) continue; // descarta null/undefined/NaN/Infinity

      result.push({ value: num, referenceDate: m.referenceDate });
    }

    return result;
  }

  /**
   * Executa a agregação conforme o tipo.
   */
  private compute(
    aggregationType: Exclude<AggregationType, AggregationType.FORMULA>,
    valid: { value: number; referenceDate: Date }[],
  ): number | null {
    if (valid.length === 0) {
      // COUNT retorna 0 para período sem medições; demais retornam null
      return aggregationType === AggregationType.COUNT ? 0 : null;
    }

    switch (aggregationType) {
      case AggregationType.SUM:
        return valid.reduce((acc, m) => acc + m.value, 0);

      case AggregationType.AVG: {
        const sum = valid.reduce((acc, m) => acc + m.value, 0);
        return sum / valid.length;
      }

      case AggregationType.MIN:
        return Math.min(...valid.map((m) => m.value));

      case AggregationType.MAX:
        return Math.max(...valid.map((m) => m.value));

      case AggregationType.LAST: {
        // Ordena por referenceDate DESC; em empate, por valor ASC (determinístico)
        const sorted = [...valid].sort((a, b) => {
          const diff = b.referenceDate.getTime() - a.referenceDate.getTime();
          if (diff !== 0) return diff;
          // Desempate determinístico: valor menor vem primeiro (mais estável)
          return a.value - b.value;
        });
        return sorted[0].value;
      }

      case AggregationType.COUNT:
        return valid.length;

      default: {
        // Exhaustiveness check — nunca deve ser alcançado com os enums cobertos
        const _exhaustive: never = aggregationType;
        throw new Error(
          `AggregationType não suportado: ${String(_exhaustive)}`,
        );
      }
    }
  }

  /**
   * Converte DecimalLike para number | null.
   * Retorna null para null/undefined/NaN/Infinity.
   */
  private toNumber(d: DecimalLike): number | null {
    if (d == null) return null;
    const n =
      typeof d === 'object' && d !== null && 'toNumber' in d
        ? d.toNumber()
        : Number(d);
    if (!isFinite(n) || isNaN(n)) return null;
    return n;
  }
}
