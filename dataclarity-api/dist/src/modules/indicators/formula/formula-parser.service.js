"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaParserService = void 0;
const common_1 = require("@nestjs/common");
const formula_errors_1 = require("./formula.errors");
const formula_tokenizer_service_1 = require("./formula-tokenizer.service");
let FormulaParserService = class FormulaParserService {
    tokenizer;
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }
    parse(formula) {
        const tokens = this.tokenizer.tokenize(formula);
        const ctx = new ParseContext(tokens, formula);
        const ast = ctx.parseExpr();
        if (ctx.current().kind !== 'EOF') {
            const tok = ctx.current();
            throw new formula_errors_1.FormulaSyntaxError(`Token inesperado "${tok.value || tok.kind}" na posição ${tok.position}. ` +
                `Esperava fim da expressão.`, formula, tok.position);
        }
        return ast;
    }
};
exports.FormulaParserService = FormulaParserService;
exports.FormulaParserService = FormulaParserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [formula_tokenizer_service_1.FormulaTokenizerService])
], FormulaParserService);
class ParseContext {
    tokens;
    formula;
    pos = 0;
    constructor(tokens, formula) {
        this.tokens = tokens;
        this.formula = formula;
    }
    current() {
        return this.tokens[this.pos];
    }
    consume() {
        const tok = this.tokens[this.pos];
        this.pos++;
        return tok;
    }
    expect(kind) {
        const tok = this.current();
        if (tok.kind !== kind) {
            throw new formula_errors_1.FormulaSyntaxError(`Esperava "${kind}" mas encontrou "${tok.value || tok.kind}" na posição ${tok.position}.`, this.formula, tok.position);
        }
        return this.consume();
    }
    parseExpr() {
        let left = this.parseTerm();
        while (this.current().kind === 'PLUS' || this.current().kind === 'MINUS') {
            const op = this.consume();
            const right = this.parseTerm();
            const node = {
                kind: 'BinaryExpression',
                operator: op.value,
                left,
                right,
            };
            left = node;
        }
        return left;
    }
    parseTerm() {
        let left = this.parseUnary();
        while (this.current().kind === 'STAR' ||
            this.current().kind === 'SLASH' ||
            this.current().kind === 'PERCENT') {
            const op = this.consume();
            const right = this.parseUnary();
            const node = {
                kind: 'BinaryExpression',
                operator: op.value,
                left,
                right,
            };
            left = node;
        }
        return left;
    }
    parseUnary() {
        if (this.current().kind === 'PLUS' || this.current().kind === 'MINUS') {
            const op = this.consume();
            const operand = this.parseUnary();
            const node = {
                kind: 'UnaryExpression',
                operator: op.value,
                operand,
            };
            return node;
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const tok = this.current();
        if (tok.kind === 'NUMBER') {
            this.consume();
            const value = parseFloat(tok.value);
            if (!isFinite(value) || isNaN(value)) {
                throw new formula_errors_1.FormulaSyntaxError(`Número inválido "${tok.value}" na posição ${tok.position}.`, this.formula, tok.position);
            }
            const node = {
                kind: 'NumberLiteral',
                value,
            };
            return node;
        }
        if (tok.kind === 'IDENTIFIER') {
            this.consume();
            const funcName = tok.value;
            if (this.current().kind !== 'LPAREN') {
                throw new formula_errors_1.FormulaSyntaxError(`Identificador "${funcName}" na posição ${tok.position} não é uma chamada de função. ` +
                    `Variáveis não são suportadas. Use funções como SUM(), AVG(), etc.`, this.formula, tok.position);
            }
            this.expect('LPAREN');
            const args = this.parseArgs();
            this.expect('RPAREN');
            const node = {
                kind: 'FunctionCall',
                name: funcName,
                args,
            };
            return node;
        }
        if (tok.kind === 'LPAREN') {
            this.consume();
            const inner = this.parseExpr();
            this.expect('RPAREN');
            return inner;
        }
        if (tok.kind === 'EOF') {
            throw new formula_errors_1.FormulaSyntaxError(`Fim inesperado da fórmula. Esperava um número, função ou '('.`, this.formula, tok.position);
        }
        throw new formula_errors_1.FormulaSyntaxError(`Token inesperado "${tok.value || tok.kind}" na posição ${tok.position}. ` +
            `Esperava um número, função ou '('.`, this.formula, tok.position);
    }
    parseArgs() {
        const args = [];
        if (this.current().kind === 'RPAREN') {
            return args;
        }
        args.push(this.parseExpr());
        while (this.current().kind === 'COMMA') {
            this.consume();
            if (this.current().kind === 'RPAREN') {
                const tok = this.current();
                throw new formula_errors_1.FormulaSyntaxError(`Vírgula à direita não é permitida antes de ')' na posição ${tok.position}.`, this.formula, tok.position);
            }
            args.push(this.parseExpr());
        }
        return args;
    }
}
//# sourceMappingURL=formula-parser.service.js.map