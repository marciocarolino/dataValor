import { FormulaParserService } from './formula-parser.service';
import { FormulaTokenizerService } from './formula-tokenizer.service';
import { FormulaSyntaxError } from './formula.errors';
import {
  BinaryExpressionNode,
  FunctionCallNode,
  NumberLiteralNode,
  UnaryExpressionNode,
} from './ast/formula-ast.types';

// ── Setup ─────────────────────────────────────────────────────────────────────

function makeParser(): FormulaParserService {
  return new FormulaParserService(new FormulaTokenizerService());
}

describe('FormulaParserService', () => {
  let svc: FormulaParserService;

  beforeEach(() => {
    svc = makeParser();
  });

  // ── 10. Número simples ───────────────────────────────────────────────────

  describe('10. Número simples', () => {
    it('parseia número inteiro', () => {
      const ast = svc.parse('42') as NumberLiteralNode;
      expect(ast.kind).toBe('NumberLiteral');
      expect(ast.value).toBe(42);
    });

    it('parseia número decimal', () => {
      const ast = svc.parse('3.14') as NumberLiteralNode;
      expect(ast.kind).toBe('NumberLiteral');
      expect(ast.value).toBeCloseTo(3.14);
    });

    it('parseia zero', () => {
      const ast = svc.parse('0') as NumberLiteralNode;
      expect(ast.kind).toBe('NumberLiteral');
      expect(ast.value).toBe(0);
    });
  });

  // ── 11. Soma ─────────────────────────────────────────────────────────────

  describe('11. Soma', () => {
    it('parseia soma simples', () => {
      const ast = svc.parse('10 + 5') as BinaryExpressionNode;
      expect(ast.kind).toBe('BinaryExpression');
      expect(ast.operator).toBe('+');
      expect((ast.left as NumberLiteralNode).value).toBe(10);
      expect((ast.right as NumberLiteralNode).value).toBe(5);
    });

    it('soma é associativa à esquerda: 1 + 2 + 3', () => {
      const ast = svc.parse('1 + 2 + 3') as BinaryExpressionNode;
      // (1 + 2) + 3
      expect(ast.kind).toBe('BinaryExpression');
      expect(ast.operator).toBe('+');
      const left = ast.left as BinaryExpressionNode;
      expect(left.kind).toBe('BinaryExpression');
      expect(left.operator).toBe('+');
      expect((ast.right as NumberLiteralNode).value).toBe(3);
    });
  });

  // ── 12. Subtração ────────────────────────────────────────────────────────

  describe('12. Subtração', () => {
    it('parseia subtração simples', () => {
      const ast = svc.parse('10 - 5') as BinaryExpressionNode;
      expect(ast.operator).toBe('-');
      expect((ast.left as NumberLiteralNode).value).toBe(10);
      expect((ast.right as NumberLiteralNode).value).toBe(5);
    });
  });

  // ── 13. Multiplicação ────────────────────────────────────────────────────

  describe('13. Multiplicação', () => {
    it('parseia multiplicação simples', () => {
      const ast = svc.parse('3 * 4') as BinaryExpressionNode;
      expect(ast.operator).toBe('*');
    });
  });

  // ── 14. Divisão ──────────────────────────────────────────────────────────

  describe('14. Divisão', () => {
    it('parseia divisão simples', () => {
      const ast = svc.parse('10 / 2') as BinaryExpressionNode;
      expect(ast.operator).toBe('/');
    });
  });

  // ── 15. Módulo ───────────────────────────────────────────────────────────

  describe('15. Módulo', () => {
    it('parseia módulo', () => {
      const ast = svc.parse('10 % 3') as BinaryExpressionNode;
      expect(ast.operator).toBe('%');
    });
  });

  // ── 16. Precedência ──────────────────────────────────────────────────────

  describe('16. Precedência de operadores', () => {
    it('10 + 5 * 2 → + na raiz, * dentro do right', () => {
      const ast = svc.parse('10 + 5 * 2') as BinaryExpressionNode;
      expect(ast.operator).toBe('+');
      expect((ast.left as NumberLiteralNode).value).toBe(10);
      const right = ast.right as BinaryExpressionNode;
      expect(right.operator).toBe('*');
      expect((right.left as NumberLiteralNode).value).toBe(5);
      expect((right.right as NumberLiteralNode).value).toBe(2);
    });

    it('multiplicação tem precedência maior que subtração', () => {
      const ast = svc.parse('6 - 2 * 3') as BinaryExpressionNode;
      expect(ast.operator).toBe('-');
      const right = ast.right as BinaryExpressionNode;
      expect(right.operator).toBe('*');
    });
  });

  // ── 17. Parênteses ───────────────────────────────────────────────────────

  describe('17. Parênteses', () => {
    it('(10 + 5) * 2 → * na raiz', () => {
      const ast = svc.parse('(10 + 5) * 2') as BinaryExpressionNode;
      expect(ast.operator).toBe('*');
      const left = ast.left as BinaryExpressionNode;
      expect(left.operator).toBe('+');
    });

    it('parênteses aninhados', () => {
      const ast = svc.parse('((1 + 2) * (3 + 4))') as BinaryExpressionNode;
      expect(ast.operator).toBe('*');
    });
  });

  // ── 18. Operadores unários ───────────────────────────────────────────────

  describe('18. Operadores unários', () => {
    it('parseia -10', () => {
      const ast = svc.parse('-10') as UnaryExpressionNode;
      expect(ast.kind).toBe('UnaryExpression');
      expect(ast.operator).toBe('-');
      expect((ast.operand as NumberLiteralNode).value).toBe(10);
    });

    it('parseia +10 (unário positivo)', () => {
      const ast = svc.parse('+10') as UnaryExpressionNode;
      expect(ast.kind).toBe('UnaryExpression');
      expect(ast.operator).toBe('+');
    });

    it('diferencia 10 - 5 (binário) de -10 (unário)', () => {
      const bin = svc.parse('10 - 5');
      expect(bin.kind).toBe('BinaryExpression');

      const un = svc.parse('-10');
      expect(un.kind).toBe('UnaryExpression');
    });

    it('-(SUM() + 1)', () => {
      const ast = svc.parse('-(SUM() + 1)') as UnaryExpressionNode;
      expect(ast.kind).toBe('UnaryExpression');
      expect(ast.operator).toBe('-');
      expect(ast.operand.kind).toBe('BinaryExpression');
    });
  });

  // ── 19. Funções ──────────────────────────────────────────────────────────

  describe('19. Funções', () => {
    it('parseia SUM()', () => {
      const ast = svc.parse('SUM()') as FunctionCallNode;
      expect(ast.kind).toBe('FunctionCall');
      expect(ast.name).toBe('SUM');
      expect(ast.args).toHaveLength(0);
    });

    it('parseia COUNT()', () => {
      const ast = svc.parse('COUNT()') as FunctionCallNode;
      expect(ast.kind).toBe('FunctionCall');
      expect(ast.name).toBe('COUNT');
      expect(ast.args).toHaveLength(0);
    });

    it('parseia ABS(10)', () => {
      const ast = svc.parse('ABS(10)') as FunctionCallNode;
      expect(ast.kind).toBe('FunctionCall');
      expect(ast.name).toBe('ABS');
      expect(ast.args).toHaveLength(1);
      expect((ast.args[0] as NumberLiteralNode).value).toBe(10);
    });

    it('parseia função com expressão como argumento: ABS(SUM() - 5)', () => {
      const ast = svc.parse('ABS(SUM() - 5)') as FunctionCallNode;
      expect(ast.kind).toBe('FunctionCall');
      expect(ast.name).toBe('ABS');
      expect(ast.args[0].kind).toBe('BinaryExpression');
    });
  });

  // ── 20. Expressões aninhadas ─────────────────────────────────────────────

  describe('20. Expressões aninhadas', () => {
    it('(SUM() - MIN()) / MAX() * 100', () => {
      const ast = svc.parse('(SUM() - MIN()) / MAX() * 100');
      // * na raiz (associatividade à esquerda de / e *)
      expect(ast.kind).toBe('BinaryExpression');
    });

    it('SUM() / COUNT() produz BinaryExpression com FunctionCall nos dois lados', () => {
      const ast = svc.parse('SUM() / COUNT()') as BinaryExpressionNode;
      expect(ast.kind).toBe('BinaryExpression');
      expect(ast.operator).toBe('/');
      expect(ast.left.kind).toBe('FunctionCall');
      expect((ast.left as FunctionCallNode).name).toBe('SUM');
      expect(ast.right.kind).toBe('FunctionCall');
      expect((ast.right as FunctionCallNode).name).toBe('COUNT');
    });
  });

  // ── 21. Parênteses não fechados ──────────────────────────────────────────

  describe('21. Parênteses não fechados', () => {
    it('rejeita SUM(', () => {
      expect(() => svc.parse('SUM(')).toThrow(FormulaSyntaxError);
    });

    it('rejeita (10 + 5', () => {
      expect(() => svc.parse('(10 + 5')).toThrow(FormulaSyntaxError);
    });
  });

  // ── 22. Tokens inesperados ───────────────────────────────────────────────

  describe('22. Tokens inesperados', () => {
    it('rejeita identificador sem parênteses (variável)', () => {
      expect(() => svc.parse('foo')).toThrow(FormulaSyntaxError);
    });

    it('rejeita dois números consecutivos', () => {
      expect(() => svc.parse('10 20')).toThrow(FormulaSyntaxError);
    });

    it('rejeita "+ +" — segundo + sem operando', () => {
      expect(() => svc.parse('+ +')).toThrow(FormulaSyntaxError);
    });

    it('rejeita vírgula fora de chamada de função', () => {
      expect(() => svc.parse('10, 20')).toThrow(FormulaSyntaxError);
    });

    it('rejeita trailing comma: ABS(10,)', () => {
      expect(() => svc.parse('ABS(10,)')).toThrow(FormulaSyntaxError);
    });

    it('fórmula vazia lança FormulaSyntaxError', () => {
      expect(() => svc.parse('')).toThrow(FormulaSyntaxError);
    });
  });
});
