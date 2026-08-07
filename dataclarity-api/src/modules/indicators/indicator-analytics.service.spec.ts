import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { IndicatorTargetStatus } from './enums/indicator-target-status.enum';
import { IndicatorVariationStatus } from './enums/indicator-variation-status.enum';

/** Cria um Decimal-like simples para os testes */
const d = (n: number) => ({ toNumber: () => n });

describe('IndicatorAnalyticsService', () => {
  let svc: IndicatorAnalyticsService;

  beforeEach(() => {
    svc = new IndicatorAnalyticsService();
  });

  // ── computeVariation ───────────────────────────────────────────────────────

  describe('computeVariation()', () => {
    it('deve calcular variação positiva: 1590 e 1300 ≈ +22.3077', () => {
      const { variation, variationCalculationStatus } = svc.computeVariation(
        1590,
        1300,
      );
      expect(variation).toBeCloseTo(22.3076923077, 4);
      expect(variationCalculationStatus).toBe(
        IndicatorVariationStatus.CALCULATED,
      );
    });

    it('deve calcular variação negativa', () => {
      const { variation } = svc.computeVariation(900, 1000);
      expect(variation).toBeCloseTo(-10, 4);
    });

    it('deve retornar 0 para valores iguais', () => {
      const { variation } = svc.computeVariation(1000, 1000);
      expect(variation).toBe(0);
    });

    it('deve retornar null quando currentValue é null', () => {
      const { variation, variationCalculationStatus } = svc.computeVariation(
        null,
        1000,
      );
      expect(variation).toBeNull();
      expect(variationCalculationStatus).toBe(
        IndicatorVariationStatus.NO_CURRENT_VALUE,
      );
    });

    it('deve retornar null quando previousValue é null', () => {
      const { variation, variationCalculationStatus } = svc.computeVariation(
        1000,
        null,
      );
      expect(variation).toBeNull();
      expect(variationCalculationStatus).toBe(
        IndicatorVariationStatus.NO_PREVIOUS_VALUE,
      );
    });

    it('deve retornar null quando previousValue é zero (divisão por zero)', () => {
      const { variation, variationCalculationStatus } = svc.computeVariation(
        1000,
        0,
      );
      expect(variation).toBeNull();
      expect(variationCalculationStatus).toBe(
        IndicatorVariationStatus.PREVIOUS_VALUE_ZERO,
      );
    });

    it('deve suportar valores negativos', () => {
      // currentValue = -50, previousValue = -100 → +50%
      const { variation } = svc.computeVariation(-50, -100);
      expect(variation).toBeCloseTo(50, 4);
    });
  });

  // ── computeDaysRemaining ──────────────────────────────────────────────────

  describe('computeDaysRemaining()', () => {
    it('deve retornar null quando endDate é null', () => {
      const { daysRemaining, isOverdue } = svc.computeDaysRemaining(null);
      expect(daysRemaining).toBeNull();
      expect(isOverdue).toBe(false);
    });

    it('deve calcular dias restantes para data futura', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 22); // +22 dias
      future.setUTCHours(0, 0, 0, 0);
      const { daysRemaining, isOverdue } = svc.computeDaysRemaining(future);
      // "Não contar o dia atual" → 21 dias
      expect(daysRemaining).toBe(21);
      expect(isOverdue).toBe(false);
    });

    it('deve indicar prazo vencido (negativo) quando endDate no passado', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 5);
      const { daysRemaining, isOverdue } = svc.computeDaysRemaining(past);
      expect(daysRemaining).toBeLessThan(0);
      expect(isOverdue).toBe(true);
    });
  });

  // ── computeTargetAchievement ──────────────────────────────────────────────

  describe('computeTargetAchievement() — HIGHER_IS_BETTER', () => {
    it('deve retornar TARGET_ACHIEVED quando currentValue >= goalValue', () => {
      const { targetStatus, targetAchievementPercentage } =
        svc.computeTargetAchievement(
          3500,
          3000,
          null,
          null,
          IndicatorDesiredDirection.HIGHER_IS_BETTER,
          30,
        );
      expect(targetStatus).toBe(IndicatorTargetStatus.TARGET_ACHIEVED);
      expect(targetAchievementPercentage).toBeCloseTo(116.6667, 2);
    });

    it('deve retornar AT_RISK quando pct 50-70 e prazo crítico', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        1800,
        3000,
        null,
        null,
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
        5, // ≤7 dias
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.AT_RISK);
    });

    it('deve retornar OFF_TRACK quando abaixo de 50%', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        1000,
        3000,
        null,
        null,
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
        30,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.OFF_TRACK);
    });

    it('deve retornar NO_DATA quando currentValue é null', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        null,
        3000,
        null,
        null,
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
        null,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.NO_DATA);
    });

    it('deve retornar NO_GOAL quando goalValue é null', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        1500,
        null,
        null,
        null,
        IndicatorDesiredDirection.HIGHER_IS_BETTER,
        null,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.NO_GOAL);
    });
  });

  describe('computeTargetAchievement() — LOWER_IS_BETTER', () => {
    it('deve retornar TARGET_ACHIEVED quando currentValue <= goalValue', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        800,
        1000,
        null,
        null,
        IndicatorDesiredDirection.LOWER_IS_BETTER,
        30,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.TARGET_ACHIEVED);
    });

    it('deve retornar OFF_TRACK quando currentValue muito acima da meta', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        3000,
        1000,
        null,
        null,
        IndicatorDesiredDirection.LOWER_IS_BETTER,
        30,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.OFF_TRACK);
    });
  });

  describe('computeTargetAchievement() — RANGE_IS_BETTER', () => {
    it('deve retornar WITHIN_RANGE quando valor está na faixa', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        1000,
        null,
        900,
        1200,
        IndicatorDesiredDirection.RANGE_IS_BETTER,
        null,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.WITHIN_RANGE);
    });

    it('deve retornar BELOW_RANGE quando valor abaixo da faixa', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        500,
        null,
        900,
        1200,
        IndicatorDesiredDirection.RANGE_IS_BETTER,
        null,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.BELOW_RANGE);
    });

    it('deve retornar ABOVE_RANGE quando valor acima da faixa', () => {
      const { targetStatus } = svc.computeTargetAchievement(
        1500,
        null,
        900,
        1200,
        IndicatorDesiredDirection.RANGE_IS_BETTER,
        null,
      );
      expect(targetStatus).toBe(IndicatorTargetStatus.ABOVE_RANGE);
    });
  });

  // ── compute() — integração ────────────────────────────────────────────────

  describe('compute() — integração', () => {
    it('duas medições: currentValue e previousValue calculados corretamente', () => {
      const refA = new Date('2026-08-07T00:00:00Z');
      const refB = new Date('2026-07-07T00:00:00Z');
      const result = svc.compute({
        measurements: [
          { value: d(1590), referenceDate: refA },
          { value: d(1300), referenceDate: refB },
        ],
        goalValue: d(3500),
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
        endDate: null,
      });
      expect(result.currentValue).toBe(1590);
      expect(result.previousValue).toBe(1300);
      expect(result.variation).toBeCloseTo(22.3076923077, 4);
      expect(result.variationCalculationStatus).toBe(
        IndicatorVariationStatus.CALCULATED,
      );
    });

    it('uma única medição: previousValue deve ser null', () => {
      const result = svc.compute({
        measurements: [{ value: d(1590), referenceDate: new Date() }],
        goalValue: d(3500),
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
        endDate: null,
      });
      expect(result.currentValue).toBe(1590);
      expect(result.previousValue).toBeNull();
      expect(result.variationCalculationStatus).toBe(
        IndicatorVariationStatus.NO_PREVIOUS_VALUE,
      );
    });

    it('nenhuma medição: currentValue e previousValue null, status NEUTRAL', () => {
      const result = svc.compute({
        measurements: [],
        goalValue: d(3500),
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
        endDate: null,
      });
      expect(result.currentValue).toBeNull();
      expect(result.previousValue).toBeNull();
      expect(result.computedStatus).toBe(IndicatorStatus.NEUTRAL);
    });

    it('cache sync: atualização de medição deve refletir nos cálculos', () => {
      // Simula inserção de medição mais recente
      const older = new Date('2026-07-01T00:00:00Z');
      const newer = new Date('2026-08-01T00:00:00Z');
      const resultBefore = svc.compute({
        measurements: [{ value: d(1000), referenceDate: older }],
        goalValue: d(2000),
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
        endDate: null,
      });
      expect(resultBefore.currentValue).toBe(1000);

      const resultAfter = svc.compute({
        measurements: [
          { value: d(1800), referenceDate: newer }, // nova medição
          { value: d(1000), referenceDate: older }, // anterior
        ],
        goalValue: d(2000),
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: IndicatorDesiredDirection.HIGHER_IS_BETTER,
        endDate: null,
      });
      expect(resultAfter.currentValue).toBe(1800);
      expect(resultAfter.previousValue).toBe(1000);
      expect(resultAfter.variation).toBeCloseTo(80, 2);
    });
  });
});
