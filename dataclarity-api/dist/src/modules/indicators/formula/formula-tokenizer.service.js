"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaTokenizerService = void 0;
const common_1 = require("@nestjs/common");
const formula_errors_1 = require("./formula.errors");
const formula_types_1 = require("./formula.types");
let FormulaTokenizerService = class FormulaTokenizerService {
    tokenize(formula) {
        if (!formula || formula.trim().length === 0) {
            throw new formula_errors_1.FormulaSyntaxError('Fórmula não pode ser vazia.', formula);
        }
        if (formula.length > formula_types_1.FORMULA_LIMITS.MAX_FORMULA_LENGTH) {
            throw new formula_errors_1.FormulaSyntaxError(`Fórmula excede o comprimento máximo de ${formula_types_1.FORMULA_LIMITS.MAX_FORMULA_LENGTH} caracteres ` +
                `(atual: ${formula.length}).`, formula);
        }
        const tokens = [];
        let pos = 0;
        while (pos < formula.length) {
            const ch = formula[pos];
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
                pos++;
                continue;
            }
            if (ch === '+') {
                tokens.push({ kind: 'PLUS', value: '+', position: pos });
                pos++;
                continue;
            }
            if (ch === '-') {
                tokens.push({ kind: 'MINUS', value: '-', position: pos });
                pos++;
                continue;
            }
            if (ch === '*') {
                tokens.push({ kind: 'STAR', value: '*', position: pos });
                pos++;
                continue;
            }
            if (ch === '/') {
                tokens.push({ kind: 'SLASH', value: '/', position: pos });
                pos++;
                continue;
            }
            if (ch === '%') {
                tokens.push({ kind: 'PERCENT', value: '%', position: pos });
                pos++;
                continue;
            }
            if (ch === '(') {
                tokens.push({ kind: 'LPAREN', value: '(', position: pos });
                pos++;
                continue;
            }
            if (ch === ')') {
                tokens.push({ kind: 'RPAREN', value: ')', position: pos });
                pos++;
                continue;
            }
            if (ch === ',') {
                tokens.push({ kind: 'COMMA', value: ',', position: pos });
                pos++;
                continue;
            }
            if (ch >= '0' && ch <= '9') {
                const start = pos;
                while (pos < formula.length &&
                    formula[pos] >= '0' &&
                    formula[pos] <= '9') {
                    pos++;
                }
                if (pos < formula.length && formula[pos] === '.') {
                    pos++;
                    if (pos >= formula.length ||
                        formula[pos] < '0' ||
                        formula[pos] > '9') {
                        throw new formula_errors_1.FormulaSyntaxError(`Número inválido na posição ${start}: dígito esperado após '.'.`, formula, start);
                    }
                    while (pos < formula.length &&
                        formula[pos] >= '0' &&
                        formula[pos] <= '9') {
                        pos++;
                    }
                }
                if (pos < formula.length && isIdentifierStart(formula[pos])) {
                    throw new formula_errors_1.FormulaSyntaxError(`Caractere inválido na posição ${pos}: letra imediatamente após número.`, formula, pos);
                }
                tokens.push({
                    kind: 'NUMBER',
                    value: formula.slice(start, pos),
                    position: start,
                });
                continue;
            }
            if (isIdentifierStart(ch)) {
                const start = pos;
                while (pos < formula.length && isIdentifierPart(formula[pos])) {
                    pos++;
                }
                tokens.push({
                    kind: 'IDENTIFIER',
                    value: formula.slice(start, pos),
                    position: start,
                });
                continue;
            }
            throw new formula_errors_1.FormulaSyntaxError(`Caractere inválido "${ch}" na posição ${pos}. ` +
                `A fórmula aceita apenas números, operadores (+, -, *, /, %), parênteses e funções.`, formula, pos);
        }
        tokens.push({ kind: 'EOF', value: '', position: pos });
        return tokens;
    }
};
exports.FormulaTokenizerService = FormulaTokenizerService;
exports.FormulaTokenizerService = FormulaTokenizerService = __decorate([
    (0, common_1.Injectable)()
], FormulaTokenizerService);
function isIdentifierStart(ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_';
}
function isIdentifierPart(ch) {
    return ((ch >= 'A' && ch <= 'Z') ||
        (ch >= 'a' && ch <= 'z') ||
        (ch >= '0' && ch <= '9') ||
        ch === '_');
}
//# sourceMappingURL=formula-tokenizer.service.js.map