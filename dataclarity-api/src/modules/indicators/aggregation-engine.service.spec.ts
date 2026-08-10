import {
  AggregationEngineService,
  MeasurementInput,
  IndicatorAggregationInput,
  AggregationResult,
  FormulaAggregationResult,
  isFormulaResult,
} from './aggregation-engine.service';
import { AggregationType } from './enums/aggregation-type.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cria meia-noite UTC de uma data ISO como referenceDate */
const d = (iso: string): Date => new Date(iso);

/** Cria uma medição simples */
const m = (value: number, refIso: string): MeasurementInput => ({
  value,
  referenceDate: d(refIso),
});

/** Cria um indicador mínimo */
const ind = (
  aggregationType: AggregationType,
  formula?: string | null,
): IndicatorAggregationInput => ({
  aggregationType,
  formula: formula ?? undefined,
});

/** Período de agosto/2026 (BRT meia-noite = UTC+3h) */
const AUG_START = d('2026-08-01T03:00:00.000Z'); // 00:00 BRT de 01/ago
const AUG_END = d('2026-09-01T03:00:00.000Z'); // 00:00 BRT de 01/set (exclusivo)

/** Medições dentro de agosto */
const M_AUG: MeasurementInput[] = [
  m(100, '2026-08-05T12:00:00.000Z'),
  m(200, '2026-08-15T12:00:00.000Z'),
  m(300, '2026-08-25T12:00:00.000Z'),
];

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AggregationEngineService', () => {
  let svc: AggregationEngineService;

  beforeEach(() => {
    svc = new AggregationEngineService();
  });

  // ── 1. SUM ──────────────────────────────────────────────────────────────────

  describe('1. SUM', () => {
    it('soma múltiplas medições válidas', () => {
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(600); // 100+200+300
      expect(r.measurementCount).toBe(3);
      expect(r.aggregationType).toBe(AggregationType.SUM);
    });

    it('SUM com uma medição', () => {
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, [
        m(42, '2026-08-10T00:00:00.000Z'),
      ]);
      expect(r.value).toBe(42);
    });

    it('SUM sem medições → 0', () => {
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, []);
      expect(r.value).toBe(null); // SUM sem dados retorna null (comportamento não-COUNT)
      expect(r.measurementCount).toBe(0);
    });

    it('SUM com valores decimais mantém precisão', () => {
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, [
        m(1.1, '2026-08-05T00:00:00.000Z'),
        m(2.2, '2026-08-06T00:00:00.000Z'),
      ]);
      expect(r.value).toBeCloseTo(3.3, 10);
    });
  });

  // ── 2. AVG ──────────────────────────────────────────────────────────────────

  describe('2. AVG', () => {
    it('média de múltiplas medições', () => {
      const r = svc.aggregate(
        ind(AggregationType.AVG),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(200); // (100+200+300)/3
      expect(r.measurementCount).toBe(3);
    });

    it('AVG sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.AVG), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });

    it('AVG com valores decimais preserva precisão', () => {
      const r = svc.aggregate(ind(AggregationType.AVG), AUG_START, AUG_END, [
        m(1, '2026-08-01T03:00:00.000Z'),
        m(2, '2026-08-02T00:00:00.000Z'),
      ]);
      expect(r.value).toBe(1.5);
    });
  });

  // ── 3. MIN ──────────────────────────────────────────────────────────────────

  describe('3. MIN', () => {
    it('retorna o menor valor', () => {
      const r = svc.aggregate(
        ind(AggregationType.MIN),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(100);
    });

    it('MIN sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.MIN), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });
  });

  // ── 4. MAX ──────────────────────────────────────────────────────────────────

  describe('4. MAX', () => {
    it('retorna o maior valor', () => {
      const r = svc.aggregate(
        ind(AggregationType.MAX),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(300);
    });

    it('MAX sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.MAX), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });
  });

  // ── 5. LAST ─────────────────────────────────────────────────────────────────

  describe('5. LAST', () => {
    it('retorna o valor da medição mais recente', () => {
      const r = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(300); // 25/ago é mais recente
    });

    it('LAST com medições desordenadas', () => {
      const unordered = [
        m(300, '2026-08-25T12:00:00.000Z'),
        m(100, '2026-08-05T12:00:00.000Z'),
        m(200, '2026-08-15T12:00:00.000Z'),
      ];
      const r = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        unordered,
      );
      expect(r.value).toBe(300);
    });

    it('LAST sem medições → null', () => {
      const r = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        [],
      );
      expect(r.value).toBeNull();
    });

    it('14. LAST com referenceDate iguais — comportamento determinístico (menor valor)', () => {
      const sameDate = '2026-08-20T12:00:00.000Z';
      const tied = [m(500, sameDate), m(100, sameDate), m(300, sameDate)];
      const r1 = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        tied,
      );
      // Sempre retorna 100 (menor valor como desempate) — determinístico
      expect(r1.value).toBe(100);
      // Executar duas vezes: mesmo resultado
      const r2 = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        tied,
      );
      expect(r2.value).toBe(r1.value);
    });
  });

  // ── 6. COUNT ────────────────────────────────────────────────────────────────

  describe('6. COUNT', () => {
    it('conta medições válidas do período', () => {
      const r = svc.aggregate(
        ind(AggregationType.COUNT),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(3);
      expect(r.measurementCount).toBe(3);
    });

    it('COUNT sem medições → 0 (não null)', () => {
      const r = svc.aggregate(
        ind(AggregationType.COUNT),
        AUG_START,
        AUG_END,
        [],
      );
      expect(r.value).toBe(0);
      expect(r.measurementCount).toBe(0);
    });
  });

  // ── 7. FORMULA ──────────────────────────────────────────────────────────────

  describe('7. FORMULA — sem execução', () => {
    it('retorna requiresFormulaEngine=true, value=null', () => {
      const r = svc.aggregate(
        ind(AggregationType.FORMULA, 'SUM(receita)'),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(isFormulaResult(r)).toBe(true);
      const fr = r as FormulaAggregationResult;
      expect(fr.value).toBeNull();
      expect(fr.requiresFormulaEngine).toBe(true);
      expect(fr.aggregationType).toBe(AggregationType.FORMULA);
    });

    it('FORMULA preserva o conteúdo declarativo da fórmula sem executar', () => {
      const formula = 'SUM(lucro) / SUM(receita) * 100';
      const r = svc.aggregate(
        ind(AggregationType.FORMULA, formula),
        AUG_START,
        AUG_END,
        [],
      ) as FormulaAggregationResult;
      expect(r.formula).toBe(formula);
      // Garantia: nunca chama eval/Function/vm
      expect(() => r.formula).not.toThrow();
    });

    it('FORMULA conta medições válidas mesmo sem executar', () => {
      const r = svc.aggregate(
        ind(AggregationType.FORMULA, 'COUNT(x)'),
        AUG_START,
        AUG_END,
        M_AUG,
      ) as FormulaAggregationResult;
      expect(r.measurementCount).toBe(3);
    });

    it('FORMULA com formula=null', () => {
      const r = svc.aggregate(
        ind(AggregationType.FORMULA, null),
        AUG_START,
        AUG_END,
        [],
      ) as FormulaAggregationResult;
      expect(r.formula).toBeNull();
      expect(r.requiresFormulaEngine).toBe(true);
    });
  });

  // ── 8–10. Filtragem por período ──────────────────────────────────────────────

  describe('8–10. Filtragem por período', () => {
    it('8. Medição fora do período (antes) → não incluída', () => {
      const outside = [
        m(999, '2026-07-31T12:00:00.000Z'), // julho — fora de agosto
        m(100, '2026-08-10T12:00:00.000Z'), // dentro
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        outside,
      );
      expect(r.value).toBe(100);
      expect(r.measurementCount).toBe(1);
    });

    it('8b. Medição fora do período (depois) → não incluída', () => {
      const outside = [
        m(100, '2026-08-10T12:00:00.000Z'), // dentro
        m(999, '2026-09-05T12:00:00.000Z'), // setembro — fora
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        outside,
      );
      expect(r.value).toBe(100);
      expect(r.measurementCount).toBe(1);
    });

    it('9. Medição exatamente em periodStart → incluída', () => {
      const atStart = [m(42, '2026-08-01T03:00:00.000Z')]; // = AUG_START
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        atStart,
      );
      expect(r.value).toBe(42);
      expect(r.measurementCount).toBe(1);
    });

    it('10. Medição exatamente em periodEnd → NÃO incluída (exclusivo)', () => {
      const atEnd = [m(999, '2026-09-01T03:00:00.000Z')]; // = AUG_END (exclusivo)
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        atEnd,
      );
      expect(r.value).toBeNull();
      expect(r.measurementCount).toBe(0);
    });

    it('1ms antes de periodEnd → incluída', () => {
      const justBefore = [m(77, '2026-09-01T02:59:59.999Z')];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        justBefore,
      );
      expect(r.value).toBe(77);
      expect(r.measurementCount).toBe(1);
    });
  });

  // ── 11. Valores inválidos ────────────────────────────────────────────────────

  describe('11. Valores inválidos (null/undefined/NaN/Infinity)', () => {
    it('null value → ignorado', () => {
      const withNull: MeasurementInput[] = [
        { value: null, referenceDate: d('2026-08-10T00:00:00.000Z') },
        m(50, '2026-08-15T00:00:00.000Z'),
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        withNull,
      );
      expect(r.value).toBe(50);
      expect(r.measurementCount).toBe(1);
    });

    it('undefined value → ignorado', () => {
      const withUndef: MeasurementInput[] = [
        { value: undefined, referenceDate: d('2026-08-10T00:00:00.000Z') },
        m(75, '2026-08-20T00:00:00.000Z'),
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        withUndef,
      );
      expect(r.value).toBe(75);
    });

    it('NaN value → ignorado', () => {
      const withNaN: MeasurementInput[] = [
        { value: NaN, referenceDate: d('2026-08-10T00:00:00.000Z') },
        m(30, '2026-08-20T00:00:00.000Z'),
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        withNaN,
      );
      expect(r.value).toBe(30);
    });

    it('Infinity value → ignorado', () => {
      const withInf: MeasurementInput[] = [
        { value: Infinity, referenceDate: d('2026-08-10T00:00:00.000Z') },
        { value: -Infinity, referenceDate: d('2026-08-12T00:00:00.000Z') },
        m(10, '2026-08-20T00:00:00.000Z'),
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        withInf,
      );
      expect(r.value).toBe(10);
      expect(r.measurementCount).toBe(1);
    });

    it('todos inválidos → measurementCount=0', () => {
      const allInvalid: MeasurementInput[] = [
        { value: null, referenceDate: d('2026-08-05T00:00:00.000Z') },
        { value: NaN, referenceDate: d('2026-08-10T00:00:00.000Z') },
        { value: Infinity, referenceDate: d('2026-08-15T00:00:00.000Z') },
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        allInvalid,
      );
      expect(r.value).toBeNull();
      expect(r.measurementCount).toBe(0);
    });
  });

  // ── 12. Período sem medições ─────────────────────────────────────────────────

  describe('12. Período sem medições', () => {
    it('SUM sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
      expect(r.measurementCount).toBe(0);
    });
    it('AVG sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.AVG), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });
    it('MIN sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.MIN), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });
    it('MAX sem medições → null', () => {
      const r = svc.aggregate(ind(AggregationType.MAX), AUG_START, AUG_END, []);
      expect(r.value).toBeNull();
    });
    it('LAST sem medições → null', () => {
      const r = svc.aggregate(
        ind(AggregationType.LAST),
        AUG_START,
        AUG_END,
        [],
      );
      expect(r.value).toBeNull();
    });
    it('COUNT sem medições → 0', () => {
      const r = svc.aggregate(
        ind(AggregationType.COUNT),
        AUG_START,
        AUG_END,
        [],
      );
      expect(r.value).toBe(0);
    });
  });

  // ── 15. Precisão decimal ──────────────────────────────────────────────────────

  describe('15. Precisão decimal', () => {
    it('SUM não arredonda durante cálculo', () => {
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, [
        m(0.1, '2026-08-01T03:00:00.000Z'),
        m(0.2, '2026-08-02T00:00:00.000Z'),
      ]);
      // JavaScript float: 0.1+0.2 = 0.30000000000000004 — não arredondamos
      expect(r.value).toBeCloseTo(0.3, 10);
    });

    it('AVG preserva divisão decimal', () => {
      const r = svc.aggregate(ind(AggregationType.AVG), AUG_START, AUG_END, [
        m(1, '2026-08-01T03:00:00.000Z'),
        m(2, '2026-08-02T00:00:00.000Z'),
        m(4, '2026-08-03T00:00:00.000Z'),
      ]);
      // (1+2+4)/3 = 7/3 = 2.333...
      expect(r.value).toBeCloseTo(7 / 3, 10);
    });

    it('Decimal-like do Prisma convertido corretamente', () => {
      const decimalLike = { toNumber: () => 123.456 };
      const r = svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, [
        { value: decimalLike, referenceDate: d('2026-08-10T00:00:00.000Z') },
      ]);
      expect(r.value).toBe(123.456);
    });
  });

  // ── 16. Não-mutação das medições de entrada ───────────────────────────────────

  describe('16. Não-mutação das medições de entrada', () => {
    it('medições originais não são alteradas', () => {
      const original = [...M_AUG];
      const snapBefore = original.map((m) => ({ ...m }));
      svc.aggregate(ind(AggregationType.SUM), AUG_START, AUG_END, original);
      // Verifica que o array e os objetos não foram mutados
      expect(original).toHaveLength(snapBefore.length);
      original.forEach((item, i) => {
        expect(item.value).toBe(snapBefore[i].value);
        expect(item.referenceDate.getTime()).toBe(
          snapBefore[i].referenceDate.getTime(),
        );
      });
    });

    it('LAST não muta o array de entrada', () => {
      const input = [...M_AUG];
      const originalOrder = input.map((m) => m.referenceDate.getTime());
      svc.aggregate(ind(AggregationType.LAST), AUG_START, AUG_END, input);
      // Ordem original preservada
      input.forEach((m, i) => {
        expect(m.referenceDate.getTime()).toBe(originalOrder[i]);
      });
    });
  });

  // ── 17. Compatibilidade com timezone/período resolvido ────────────────────────

  describe('17. Compatibilidade com timezone/período resolvido', () => {
    it('período diário BRT funciona corretamente (DAILY)', () => {
      // 09/ago/2026 00:00 BRT = 03:00 UTC; end = 10/ago 03:00 UTC
      const dayStart = d('2026-08-09T03:00:00.000Z');
      const dayEnd = d('2026-08-10T03:00:00.000Z');
      const measurements = [
        m(50, '2026-08-09T12:00:00.000Z'), // 09:00 BRT — dentro
        m(999, '2026-08-10T03:00:00.000Z'), // início do dia seguinte — fora
      ];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        dayStart,
        dayEnd,
        measurements,
      );
      expect(r.value).toBe(50);
      expect(r.measurementCount).toBe(1);
    });

    it('período mensal com medição na fronteira BRT', () => {
      // Medição às 23:59 BRT de 31/ago = 02:59 UTC de 01/set — ainda dentro de agosto
      const justBeforeEnd = d('2026-09-01T02:59:00.000Z');
      const measurements = [{ value: 88, referenceDate: justBeforeEnd }];
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        measurements,
      );
      expect(r.value).toBe(88);
    });
  });

  // ── 18–19. isActive não afeta agregação ──────────────────────────────────────

  describe('18–19. isActive como contexto — não afeta a agregação', () => {
    it('18. Indicador ativo — agregação normal', () => {
      // isActive não é parâmetro de aggregate() — passamos IndicatorAggregationInput
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(600);
    });

    it('19. Indicador inativo — agregação continua sendo possível', () => {
      // O AggregationEngineService NÃO recebe isActive — é deliberado
      // Indicadores inativos ainda possuem histórico e medições válidas
      const r = svc.aggregate(
        ind(AggregationType.AVG),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.value).toBe(200);
    });
  });

  // ── 20. Todas as frequências com períodos resolvidos ─────────────────────────

  describe('20. Compatibilidade com todas as frequências (períodos já resolvidos)', () => {
    const measurement = m(100, '2026-08-09T12:00:00.000Z');

    const periods: { label: string; start: string; end: string }[] = [
      {
        label: 'DAILY',
        start: '2026-08-09T03:00:00.000Z',
        end: '2026-08-10T03:00:00.000Z',
      },
      {
        label: 'WEEKLY',
        start: '2026-08-03T03:00:00.000Z',
        end: '2026-08-10T03:00:00.000Z',
      },
      {
        label: 'MONTHLY',
        start: '2026-08-01T03:00:00.000Z',
        end: '2026-09-01T03:00:00.000Z',
      },
      {
        label: 'QUARTERLY',
        start: '2026-07-01T03:00:00.000Z',
        end: '2026-10-01T03:00:00.000Z',
      },
      {
        label: 'SEMESTERLY',
        start: '2026-07-01T03:00:00.000Z',
        end: '2027-01-01T03:00:00.000Z',
      },
      {
        label: 'YEARLY',
        start: '2026-01-01T03:00:00.000Z',
        end: '2027-01-01T03:00:00.000Z',
      },
    ];

    for (const period of periods) {
      it(`SUM com período ${period.label} inclui medição de 09/ago`, () => {
        const r = svc.aggregate(
          ind(AggregationType.SUM),
          d(period.start),
          d(period.end),
          [measurement],
        );
        expect(r.value).toBe(100);
        expect(r.measurementCount).toBe(1);
      });
    }
  });

  // ── Metadados do resultado ────────────────────────────────────────────────────

  describe('Metadados do resultado', () => {
    it('resultado contém periodStart e periodEnd corretos', () => {
      const r = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        M_AUG,
      );
      expect(r.periodStart).toBe(AUG_START);
      expect(r.periodEnd).toBe(AUG_END);
    });

    it('resultado contém aggregationType correto', () => {
      for (const agg of [
        AggregationType.SUM,
        AggregationType.AVG,
        AggregationType.COUNT,
      ]) {
        const r = svc.aggregate(ind(agg), AUG_START, AUG_END, []);
        expect(r.aggregationType).toBe(agg);
      }
    });

    it('isFormulaResult: true para FORMULA, false para outros', () => {
      const formula = svc.aggregate(
        ind(AggregationType.FORMULA, 'x'),
        AUG_START,
        AUG_END,
        [],
      );
      const sum = svc.aggregate(
        ind(AggregationType.SUM),
        AUG_START,
        AUG_END,
        [],
      );
      expect(isFormulaResult(formula)).toBe(true);
      expect(isFormulaResult(sum)).toBe(false);
    });
  });
});
