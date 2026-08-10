import { FormulaValidatorService } from './formula-validator.service';
import { FormulaParserService } from './formula-parser.service';
import { FormulaTokenizerService } from './formula-tokenizer.service';
import {
  FormulaLimitExceededError,
  FormulaValidationError,
  UnsupportedFormulaFunctionError,
} from './formula.errors';
import { AstNode } from './ast/formula-ast.types';
import { FORMULA_LIMITS } from './formula.types';

// ── Setup ─────────────────────────────────────────────────────────────────────

function makeValidator(): FormulaValidatorService {
  return new FormulaValidatorService();
}

function makeParser(): FormulaParserService {
  return new FormulaParserService(new FormulaTokenizerService());
}

/** Parse + validate — helper para os testes */
function parseAndValidate(formula: string): void {
  const parser = makeParser();
  const validator = makeValidator();
  const ast = parser.parse(formula);
  validator.validate(ast, formula);
}

describe('FormulaValidatorService', () => {
  let validator: FormulaValidatorService;

  beforeEach(() => {
    validator = makeValidator();
  });

  // ── 23. Funções permitidas ───────────────────────────────────────────────

  describe('23. Funções da whitelist', () => {
    const allowedFunctions = [
      'SUM()',
      'AVG()',
      'MIN()',
      'MAX()',
      'LAST()',
      'COUNT()',
      'ABS(1)',
      'ROUND(1)',
      'FLOOR(1)',
      'CEIL(1)',
    ];

    for (const formula of allowedFunctions) {
      it(`aceita ${formula}`, () => {
        expect(() => parseAndValidate(formula)).not.toThrow();
      });
    }
  });

  // ── 24. Função inexistente ───────────────────────────────────────────────

  describe('24. Função não suportada', () => {
    it('rejeita SQRT()', () => {
      expect(() => parseAndValidate('SQRT(100)')).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('rejeita LOG()', () => {
      expect(() => parseAndValidate('LOG(10)')).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('rejeita eval()', () => {
      expect(() => parseAndValidate('eval(1)')).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('rejeita require()', () => {
      expect(() => parseAndValidate('require(1)')).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('rejeita constructor()', () => {
      expect(() => parseAndValidate('constructor(1)')).toThrow(
        UnsupportedFormulaFunctionError,
      );
    });

    it('UnsupportedFormulaFunctionError contém o nome da função', () => {
      try {
        parseAndValidate('SQRT(100)');
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(UnsupportedFormulaFunctionError);
        expect((e as UnsupportedFormulaFunctionError).functionName).toBe(
          'SQRT',
        );
      }
    });
  });

  // ── 25. Aridade incorreta ────────────────────────────────────────────────

  describe('25. Aridade incorreta', () => {
    it('rejeita SUM(1) — agregada não aceita argumentos', () => {
      expect(() => parseAndValidate('SUM(1)')).toThrow(FormulaValidationError);
    });

    it('rejeita AVG(1, 2) — agregada não aceita argumentos', () => {
      expect(() => parseAndValidate('AVG(1, 2)')).toThrow(
        FormulaValidationError,
      );
    });

    it('rejeita ABS() — matemática requer 1 argumento', () => {
      expect(() => parseAndValidate('ABS()')).toThrow(FormulaValidationError);
    });

    it('rejeita ROUND(1, 2) — matemática requer exatamente 1', () => {
      expect(() => parseAndValidate('ROUND(1, 2)')).toThrow(
        FormulaValidationError,
      );
    });

    it('aceita ABS(SUM()) — argumento de função matemática pode ser agregado', () => {
      expect(() => parseAndValidate('ABS(SUM())')).not.toThrow();
    });
  });

  // ── 26. Profundidade máxima ──────────────────────────────────────────────

  describe('26. Profundidade máxima da AST', () => {
    it('aceita expressão dentro do limite', () => {
      // Expressão com profundidade razoável
      expect(() => parseAndValidate('((SUM() + AVG()) * MIN())')).not.toThrow();
    });

    it('rejeita AST que excede MAX_AST_DEPTH', () => {
      // Constrói manualmente um nó com profundidade > MAX_AST_DEPTH
      const deepNode = buildDeepNode(FORMULA_LIMITS.MAX_AST_DEPTH + 2);
      expect(() => validator.validate(deepNode)).toThrow(
        FormulaLimitExceededError,
      );
    });
  });

  // ── 27. Quantidade máxima de nós ─────────────────────────────────────────

  describe('27. Quantidade máxima de nós', () => {
    it('rejeita AST com mais de MAX_AST_NODES nós', () => {
      // Constrói um AST com muitos nós
      const wideNode = buildWideNode(FORMULA_LIMITS.MAX_AST_NODES + 5);
      expect(() => validator.validate(wideNode)).toThrow(
        FormulaLimitExceededError,
      );
    });
  });

  // ── 28. Expressão acima do comprimento ───────────────────────────────────

  describe('28. FormulaLimitExceededError contém detalhes', () => {
    it('FormulaLimitExceededError contém limitName e valores', () => {
      const deepNode = buildDeepNode(FORMULA_LIMITS.MAX_AST_DEPTH + 2);
      try {
        validator.validate(deepNode, 'deepFormula');
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(FormulaLimitExceededError);
        const err = e as FormulaLimitExceededError;
        expect(err.limitName).toBe('MAX_AST_DEPTH');
        expect(err.limitValue).toBe(FORMULA_LIMITS.MAX_AST_DEPTH);
      }
    });
  });
});

// ── Helpers para construção de AST profunda/larga ─────────────────────────────

/** Constrói um nó UnaryExpression aninhado com a profundidade especificada. */
function buildDeepNode(depth: number): AstNode {
  let node: AstNode = { kind: 'NumberLiteral', value: 1 };
  for (let i = 0; i < depth; i++) {
    node = { kind: 'UnaryExpression', operator: '-', operand: node };
  }
  return node;
}

/** Constrói uma árvore binária com muitos nós (largura). */
function buildWideNode(nodeCount: number): AstNode {
  // Cria uma cadeia de BinaryExpression: 1 + 1 + 1 + ... (nodeCount/2 pares)
  let node: AstNode = { kind: 'NumberLiteral', value: 1 };
  const iterations = Math.ceil(nodeCount / 2);
  for (let i = 0; i < iterations; i++) {
    node = {
      kind: 'BinaryExpression',
      operator: '+',
      left: node,
      right: { kind: 'NumberLiteral', value: 1 },
    };
  }
  return node;
}
