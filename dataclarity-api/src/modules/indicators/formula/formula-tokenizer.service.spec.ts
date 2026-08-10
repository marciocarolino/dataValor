import { FormulaTokenizerService } from './formula-tokenizer.service';
import { FormulaSyntaxError } from './formula.errors';
import { FORMULA_LIMITS } from './formula.types';

describe('FormulaTokenizerService', () => {
  let svc: FormulaTokenizerService;

  beforeEach(() => {
    svc = new FormulaTokenizerService();
  });

  // ── 1. Números inteiros ──────────────────────────────────────────────────

  describe('1. Números inteiros', () => {
    it('tokeniza número simples', () => {
      const tokens = svc.tokenize('10');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '10' });
    });

    it('tokeniza zero', () => {
      const tokens = svc.tokenize('0');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '0' });
    });

    it('tokeniza número grande', () => {
      const tokens = svc.tokenize('1000000');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '1000000' });
    });
  });

  // ── 2. Decimais ──────────────────────────────────────────────────────────

  describe('2. Decimais', () => {
    it('tokeniza decimal simples', () => {
      const tokens = svc.tokenize('10.5');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '10.5' });
    });

    it('tokeniza 0.25', () => {
      const tokens = svc.tokenize('0.25');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '0.25' });
    });

    it('tokeniza 1000.00', () => {
      const tokens = svc.tokenize('1000.00');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '1000.00' });
    });

    it('rejeita decimal sem dígitos após ponto: "10."', () => {
      expect(() => svc.tokenize('10.')).toThrow(FormulaSyntaxError);
    });
  });

  // ── 3. Operadores ────────────────────────────────────────────────────────

  describe('3. Operadores', () => {
    it('tokeniza +', () => {
      const tokens = svc.tokenize('+');
      expect(tokens[0]).toMatchObject({ kind: 'PLUS', value: '+' });
    });

    it('tokeniza -', () => {
      const tokens = svc.tokenize('-');
      expect(tokens[0]).toMatchObject({ kind: 'MINUS', value: '-' });
    });

    it('tokeniza *', () => {
      const tokens = svc.tokenize('*');
      expect(tokens[0]).toMatchObject({ kind: 'STAR', value: '*' });
    });

    it('tokeniza /', () => {
      const tokens = svc.tokenize('/');
      expect(tokens[0]).toMatchObject({ kind: 'SLASH', value: '/' });
    });

    it('tokeniza %', () => {
      const tokens = svc.tokenize('%');
      expect(tokens[0]).toMatchObject({ kind: 'PERCENT', value: '%' });
    });

    it('tokeniza expressão com múltiplos operadores', () => {
      const tokens = svc.tokenize('10 + 5 * 2');
      const kinds = tokens.map((t) => t.kind);
      expect(kinds).toEqual([
        'NUMBER',
        'PLUS',
        'NUMBER',
        'STAR',
        'NUMBER',
        'EOF',
      ]);
    });
  });

  // ── 4. Parênteses ────────────────────────────────────────────────────────

  describe('4. Parênteses', () => {
    it('tokeniza (', () => {
      expect(svc.tokenize('(')[0]).toMatchObject({ kind: 'LPAREN' });
    });

    it('tokeniza )', () => {
      expect(svc.tokenize(')')[0]).toMatchObject({ kind: 'RPAREN' });
    });

    it('tokeniza pares de parênteses', () => {
      const tokens = svc.tokenize('(10)');
      expect(tokens.map((t) => t.kind)).toEqual([
        'LPAREN',
        'NUMBER',
        'RPAREN',
        'EOF',
      ]);
    });
  });

  // ── 5. Identificadores de funções ────────────────────────────────────────

  describe('5. Identificadores', () => {
    it('tokeniza SUM como IDENTIFIER', () => {
      const tokens = svc.tokenize('SUM');
      expect(tokens[0]).toMatchObject({ kind: 'IDENTIFIER', value: 'SUM' });
    });

    it('tokeniza AVG como IDENTIFIER', () => {
      expect(svc.tokenize('AVG')[0]).toMatchObject({
        kind: 'IDENTIFIER',
        value: 'AVG',
      });
    });

    it('tokeniza identificador composto por letras e números', () => {
      expect(svc.tokenize('ABS')[0]).toMatchObject({
        kind: 'IDENTIFIER',
        value: 'ABS',
      });
    });

    it('tokeniza chamada de função completa SUM()', () => {
      const tokens = svc.tokenize('SUM()');
      expect(tokens.map((t) => t.kind)).toEqual([
        'IDENTIFIER',
        'LPAREN',
        'RPAREN',
        'EOF',
      ]);
      expect(tokens[0].value).toBe('SUM');
    });
  });

  // ── 6. Whitespace ────────────────────────────────────────────────────────

  describe('6. Whitespace', () => {
    it('ignora espaços', () => {
      const tokens = svc.tokenize('  10  +  5  ');
      expect(tokens.map((t) => t.kind)).toEqual([
        'NUMBER',
        'PLUS',
        'NUMBER',
        'EOF',
      ]);
    });

    it('ignora tabs', () => {
      const tokens = svc.tokenize('\t10\t');
      expect(tokens[0]).toMatchObject({ kind: 'NUMBER', value: '10' });
    });

    it('ignora newlines', () => {
      const tokens = svc.tokenize('\n10\n+\n5\n');
      expect(tokens.map((t) => t.kind)).toEqual([
        'NUMBER',
        'PLUS',
        'NUMBER',
        'EOF',
      ]);
    });
  });

  // ── 7. Caracteres inválidos ──────────────────────────────────────────────

  describe('7. Caracteres inválidos', () => {
    it('rejeita ponto isolado "."', () => {
      expect(() => svc.tokenize('.')).toThrow(FormulaSyntaxError);
    });

    it('rejeita "[" (acesso a array)', () => {
      expect(() => svc.tokenize('SUM[0]')).toThrow(FormulaSyntaxError);
    });

    it('rejeita "{" (objeto)', () => {
      expect(() => svc.tokenize('{}')).toThrow(FormulaSyntaxError);
    });

    it('rejeita aspas duplas (string)', () => {
      expect(() => svc.tokenize('"hello"')).toThrow(FormulaSyntaxError);
    });

    it('rejeita ponto-e-vírgula', () => {
      expect(() => svc.tokenize('10; 20')).toThrow(FormulaSyntaxError);
    });

    it('rejeita "@"', () => {
      expect(() => svc.tokenize('@value')).toThrow(FormulaSyntaxError);
    });

    it('process.env rejeitado por ponto', () => {
      expect(() => svc.tokenize('process.env')).toThrow(FormulaSyntaxError);
    });
  });

  // ── 8. Fórmula vazia ─────────────────────────────────────────────────────

  describe('8. Fórmula vazia', () => {
    it('rejeita string vazia', () => {
      expect(() => svc.tokenize('')).toThrow(FormulaSyntaxError);
    });

    it('rejeita string com só espaços', () => {
      expect(() => svc.tokenize('   ')).toThrow(FormulaSyntaxError);
    });
  });

  // ── 9. Fórmula muito longa ───────────────────────────────────────────────

  describe('9. Fórmula muito longa', () => {
    it(`rejeita fórmula > ${FORMULA_LIMITS.MAX_FORMULA_LENGTH} chars`, () => {
      const long = 'SUM() + '.repeat(70); // > 500 chars
      expect(long.length).toBeGreaterThan(FORMULA_LIMITS.MAX_FORMULA_LENGTH);
      expect(() => svc.tokenize(long)).toThrow(FormulaSyntaxError);
    });

    it(`aceita fórmula com exatamente ${FORMULA_LIMITS.MAX_FORMULA_LENGTH} chars`, () => {
      // Gera uma fórmula exatamente igual ao limite
      const base = 'SUM()';
      const pad = ' '.repeat(FORMULA_LIMITS.MAX_FORMULA_LENGTH - base.length);
      const formula = base + pad;
      expect(formula.length).toBe(FORMULA_LIMITS.MAX_FORMULA_LENGTH);
      expect(() => svc.tokenize(formula)).not.toThrow();
    });
  });

  // ── EOF sempre presente ──────────────────────────────────────────────────

  describe('EOF', () => {
    it('sempre termina com token EOF', () => {
      const tokens = svc.tokenize('42');
      expect(tokens[tokens.length - 1]).toMatchObject({ kind: 'EOF' });
    });

    it('expressão complexa termina com EOF', () => {
      const tokens = svc.tokenize('SUM() / COUNT()');
      expect(tokens[tokens.length - 1].kind).toBe('EOF');
    });
  });

  // ── Vírgula ──────────────────────────────────────────────────────────────

  describe('Vírgula', () => {
    it('tokeniza vírgula como COMMA', () => {
      const tokens = svc.tokenize('ABS(10,20)');
      expect(tokens.some((t) => t.kind === 'COMMA')).toBe(true);
    });
  });

  // ── Posição dos tokens ───────────────────────────────────────────────────

  describe('Posição dos tokens', () => {
    it('registra posição correta do primeiro token', () => {
      const tokens = svc.tokenize('10 + 5');
      expect(tokens[0].position).toBe(0);
    });

    it('registra posição correta após espaço', () => {
      const tokens = svc.tokenize('10 + 5');
      // '+' está na posição 3
      expect(tokens[1].position).toBe(3);
    });
  });
});
