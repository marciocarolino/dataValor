import { FormulaEngineService } from './formula-engine.service';
import { FormulaParserService } from './formula-parser.service';
import { FormulaTokenizerService } from './formula-tokenizer.service';
import { FormulaValidatorService } from './formula-validator.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import {
  DivisionByZeroError,
  FormulaEvaluationError,
  FormulaSyntaxError,
  UnsupportedFormulaFunctionError,
} from './formula.errors';
import { FormulaEvaluationContext } from './formula.types';

function makeEngine(): FormulaEngineService {
  return new FormulaEngineService(
    new FormulaParserService(new FormulaTokenizerService()),
    new FormulaValidatorService(),
    new FormulaEvaluatorService(),
  );
}

function ctx(
  overrides?: Partial<FormulaEvaluationContext['aggregates']>,
): FormulaEvaluationContext {
  return {
    aggregates: {
      SUM: 600,
      AVG: 200,
      MIN: 100,
      MAX: 300,
      LAST: 300,
      COUNT: 3,
      ...overrides,
    },
  };
}

function emptyCtx(): FormulaEvaluationContext {
  return {
    aggregates: {
      SUM: null,
      AVG: null,
      MIN: null,
      MAX: null,
      LAST: null,
      COUNT: 0,
    },
  };
}

describe('FormulaEngineService', () => {
  let engine: FormulaEngineService;
  beforeEach(() => {
    engine = makeEngine();
  });

  // ── 29-34. Funções agregadas ─────────────────────────────────────────────

  it('29. SUM() com dados = 600', () => {
    expect(engine.evaluate('SUM()', ctx()).value).toBe(600);
  });

  it('29. SUM() anti-hardcoding: valor diferente', () => {
    expect(engine.evaluate('SUM()', ctx({ SUM: 1500 })).value).toBe(1500);
  });

  it('30. AVG() = 200', () => {
    expect(engine.evaluate('AVG()', ctx()).value).toBe(200);
  });

  it('30. AVG() anti-hardcoding: AVG=75', () => {
    expect(engine.evaluate('AVG()', ctx({ AVG: 75 })).value).toBe(75);
  });

  it('31. MIN() = 100', () => {
    expect(engine.evaluate('MIN()', ctx()).value).toBe(100);
  });

  it('32. MAX() = 300', () => {
    expect(engine.evaluate('MAX()', ctx()).value).toBe(300);
  });

  it('33. LAST() = 300', () => {
    expect(engine.evaluate('LAST()', ctx()).value).toBe(300);
  });

  it('34. COUNT() = 3', () => {
    expect(engine.evaluate('COUNT()', ctx()).value).toBe(3);
  });

  it('34. COUNT() sem dados = 0 (não null)', () => {
    expect(engine.evaluate('COUNT()', emptyCtx()).value).toBe(0);
  });

  // ── 35-36. Expressões compostas ──────────────────────────────────────────

  it('35. SUM() + AVG() = 800', () => {
    expect(engine.evaluate('SUM() + AVG()', ctx()).value).toBe(800);
  });

  it('36. SUM() / COUNT() = 200', () => {
    expect(engine.evaluate('SUM() / COUNT()', ctx()).value).toBe(200);
  });

  it('36. SUM() sem dados → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('SUM()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  it('36. SUM() / COUNT() sem dados → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('SUM() / COUNT()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  // ── 37. Precedência ──────────────────────────────────────────────────────

  it('37. 10 + 5 * 2 = 20 (não 30)', () => {
    expect(engine.evaluate('10 + 5 * 2', ctx()).value).toBe(20);
  });

  it('37. 6 - 2 * 3 = 0', () => {
    expect(engine.evaluate('6 - 2 * 3', ctx()).value).toBe(0);
  });

  // ── 38. Parênteses ───────────────────────────────────────────────────────

  it('38. (10 + 5) * 2 = 30', () => {
    expect(engine.evaluate('(10 + 5) * 2', ctx()).value).toBe(30);
  });

  it('38. (SUM() - MIN()) / MAX() * 100 ≈ 166.666', () => {
    const r = engine.evaluate('(SUM() - MIN()) / MAX() * 100', ctx());
    expect(r.value).toBeCloseTo(166.666, 2);
  });

  // ── 39. Operador unário ──────────────────────────────────────────────────

  it('39. -AVG() = -200', () => {
    expect(engine.evaluate('-AVG()', ctx()).value).toBe(-200);
  });

  it('39. +SUM() = 600', () => {
    expect(engine.evaluate('+SUM()', ctx()).value).toBe(600);
  });

  it('39. -10 = -10', () => {
    expect(engine.evaluate('-10', ctx()).value).toBe(-10);
  });

  // ── 40. Módulo ───────────────────────────────────────────────────────────

  it('40. 10 % 3 = 1', () => {
    expect(engine.evaluate('10 % 3', ctx()).value).toBe(1);
  });

  it('40. COUNT() % 2 com COUNT=3 → 1', () => {
    expect(engine.evaluate('COUNT() % 2', ctx()).value).toBe(1);
  });

  // ── 41-44. Funções matemáticas ───────────────────────────────────────────

  it('41. ABS(-10) = 10', () => {
    expect(engine.evaluate('ABS(-10)', ctx()).value).toBe(10);
  });

  it('41. ABS(10) = 10', () => {
    expect(engine.evaluate('ABS(10)', ctx()).value).toBe(10);
  });

  it('41. ABS(-AVG()) com AVG=-50 → 50', () => {
    expect(engine.evaluate('ABS(-AVG())', ctx({ AVG: -50 })).value).toBe(50);
  });

  it('42. ROUND(3.7) = 4', () => {
    expect(engine.evaluate('ROUND(3.7)', ctx()).value).toBe(4);
  });

  it('42. ROUND(3.2) = 3', () => {
    expect(engine.evaluate('ROUND(3.2)', ctx()).value).toBe(3);
  });

  it('42. ROUND(AVG()) com AVG=200.7 → 201', () => {
    expect(engine.evaluate('ROUND(AVG())', ctx({ AVG: 200.7 })).value).toBe(
      201,
    );
  });

  it('43. FLOOR(3.9) = 3', () => {
    expect(engine.evaluate('FLOOR(3.9)', ctx()).value).toBe(3);
  });

  it('43. FLOOR(-2.1) = -3', () => {
    expect(engine.evaluate('FLOOR(-2.1)', ctx()).value).toBe(-3);
  });

  it('44. CEIL(3.1) = 4', () => {
    expect(engine.evaluate('CEIL(3.1)', ctx()).value).toBe(4);
  });

  it('44. CEIL(-2.9) = -2', () => {
    expect(engine.evaluate('CEIL(-2.9)', ctx()).value).toBe(-2);
  });

  // ── 45. Divisão por zero ─────────────────────────────────────────────────

  it('45. 10 / 0 → DivisionByZeroError', () => {
    expect(() => engine.evaluate('10 / 0', ctx())).toThrow(DivisionByZeroError);
  });

  it('45. SUM() / 0 → DivisionByZeroError', () => {
    expect(() => engine.evaluate('SUM() / 0', ctx())).toThrow(
      DivisionByZeroError,
    );
  });

  it('45. 10 % 0 → DivisionByZeroError', () => {
    expect(() => engine.evaluate('10 % 0', ctx())).toThrow(DivisionByZeroError);
  });

  it('45. resultado nunca é Infinity', () => {
    expect(() => engine.evaluate('10 / 0', ctx())).toThrow();
  });

  // ── 46-47. NaN/Infinity bloqueados ──────────────────────────────────────

  it('46. 0 % 0 lança (resultado seria NaN em JS)', () => {
    expect(() => engine.evaluate('0 % 0', ctx())).toThrow();
  });

  // ── 48. Ausência de medições ─────────────────────────────────────────────

  it('48. AVG() sem medições → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('AVG()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  it('48. MIN() sem medições → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('MIN()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  it('48. MAX() sem medições → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('MAX()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  it('48. LAST() sem medições → FormulaEvaluationError', () => {
    expect(() => engine.evaluate('LAST()', emptyCtx())).toThrow(
      FormulaEvaluationError,
    );
  });

  // ── 49. Precisão decimal ─────────────────────────────────────────────────

  it('49. 1 / 3 não é arredondado', () => {
    const r = engine.evaluate('1 / 3', ctx());
    expect(r.value).toBeCloseTo(0.333333, 5);
    expect(r.value).not.toBe(0);
  });

  it('49. precisão decimal com SUM/COUNT', () => {
    const r = engine.evaluate('SUM() / COUNT()', ctx({ SUM: 1.0, COUNT: 3 }));
    expect(r.value).toBeCloseTo(0.333333, 5);
  });

  // ── 50. Resultado negativo ───────────────────────────────────────────────

  it('50. MIN() - MAX() = -200 (resultado negativo válido)', () => {
    const r = engine.evaluate('MIN() - MAX()', ctx());
    expect(r.value).toBe(-200);
    expect(isFinite(r.value)).toBe(true);
  });

  // ── Resultado contém formula ─────────────────────────────────────────────

  it('resultado contém fórmula original', () => {
    const r = engine.evaluate('SUM() + 1', ctx());
    expect(r.formula).toBe('SUM() + 1');
  });

  // ── buildContext ─────────────────────────────────────────────────────────

  describe('buildContext a partir de medições', () => {
    const measurements = [
      { value: 100, referenceDate: new Date('2026-08-05T12:00:00Z') },
      { value: 200, referenceDate: new Date('2026-08-15T12:00:00Z') },
      { value: 300, referenceDate: new Date('2026-08-25T12:00:00Z') },
    ];

    it('buildContext calcula SUM corretamente', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.SUM).toBe(600);
    });

    it('buildContext calcula AVG corretamente', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.AVG).toBe(200);
    });

    it('buildContext calcula MIN corretamente', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.MIN).toBe(100);
    });

    it('buildContext calcula MAX corretamente', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.MAX).toBe(300);
    });

    it('buildContext calcula LAST corretamente (mais recente)', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.LAST).toBe(300);
    });

    it('buildContext calcula COUNT corretamente', () => {
      const c = engine.buildContext(measurements);
      expect(c.aggregates.COUNT).toBe(3);
    });

    it('buildContext com lista vazia → todos null exceto COUNT=0', () => {
      const c = engine.buildContext([]);
      expect(c.aggregates.SUM).toBeNull();
      expect(c.aggregates.AVG).toBeNull();
      expect(c.aggregates.COUNT).toBe(0);
    });

    it('evaluateWithMeasurements combina build + evaluate', () => {
      const r = engine.evaluateWithMeasurements(
        'SUM() / COUNT()',
        measurements,
      );
      expect(r.value).toBe(200);
    });

    it('evaluateWithMeasurements anti-hardcoding: fórmula diferente', () => {
      const r = engine.evaluateWithMeasurements('MAX() - MIN()', measurements);
      expect(r.value).toBe(200);
    });
  });

  // ── 51-65. Testes de segurança ───────────────────────────────────────────

  describe('Segurança: rejeição de código arbitrário', () => {
    it('51. eval(...) rejeitado (função não suportada)', () => {
      expect(() => engine.evaluate('eval(1)', ctx())).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('52. Function(...) rejeitado (identificador sem parênteses → syntax error, ou não suportada)', () => {
      expect(() => engine.evaluate('Function(1)', ctx())).toThrow();
    });

    it('53. process.env rejeitado (ponto → FormulaSyntaxError)', () => {
      expect(() => engine.evaluate('process.env', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('54. require(...) rejeitado (função não suportada)', () => {
      expect(() => engine.evaluate('require(1)', ctx())).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('55. import(...) rejeitado — ponto → syntax error', () => {
      // "import" é identificador sem parênteses... na verdade import(x) → UnsupportedFormulaFunctionError
      expect(() => engine.evaluate('import(1)', ctx())).toThrow();
    });

    it('56. constructor(...) rejeitado (função não suportada)', () => {
      expect(() => engine.evaluate('constructor(1)', ctx())).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('57. prototype — ponto → syntax error', () => {
      expect(() => engine.evaluate('Object.prototype', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('58. __proto__ — ponto → syntax error', () => {
      expect(() => engine.evaluate('a.__proto__', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('59. acesso a propriedade com ponto rejeitado', () => {
      expect(() => engine.evaluate('SUM.value', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('60. chamadas desconhecidas rejeitadas (função não suportada)', () => {
      expect(() => engine.evaluate('UNKNOWN()', ctx())).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('61. loops — for não é token válido', () => {
      expect(() => engine.evaluate('for(1)', ctx())).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('62. strings com aspas duplas rejeitadas', () => {
      expect(() => engine.evaluate('"hello"', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('63. objetos com chaves rejeitados', () => {
      expect(() => engine.evaluate('{a:1}', ctx())).toThrow(FormulaSyntaxError);
    });

    it('64. arrays com colchetes rejeitados', () => {
      expect(() => engine.evaluate('[1,2,3]', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });

    it('65. código JavaScript arbitrário rejeitado', () => {
      expect(() => engine.evaluate('1+1; alert(1)', ctx())).toThrow(
        FormulaSyntaxError,
      );
    });
  });
});
