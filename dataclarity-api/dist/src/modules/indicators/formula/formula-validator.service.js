"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaValidatorService = void 0;
const common_1 = require("@nestjs/common");
const formula_errors_1 = require("./formula.errors");
const formula_types_1 = require("./formula.types");
let FormulaValidatorService = class FormulaValidatorService {
    validate(ast, formula) {
        const state = {
            nodeCount: 0,
            formula,
        };
        this.validateNode(ast, 0, state);
    }
    validateNode(node, depth, state) {
        state.nodeCount++;
        if (state.nodeCount > formula_types_1.FORMULA_LIMITS.MAX_AST_NODES) {
            throw new formula_errors_1.FormulaLimitExceededError('MAX_AST_NODES', formula_types_1.FORMULA_LIMITS.MAX_AST_NODES, state.nodeCount, state.formula);
        }
        if (depth > formula_types_1.FORMULA_LIMITS.MAX_AST_DEPTH) {
            throw new formula_errors_1.FormulaLimitExceededError('MAX_AST_DEPTH', formula_types_1.FORMULA_LIMITS.MAX_AST_DEPTH, depth, state.formula);
        }
        switch (node.kind) {
            case 'NumberLiteral':
                break;
            case 'UnaryExpression':
                this.validateUnaryOperator(node.operator, state.formula);
                this.validateNode(node.operand, depth + 1, state);
                break;
            case 'BinaryExpression':
                this.validateBinaryOperator(node.operator, state.formula);
                this.validateNode(node.left, depth + 1, state);
                this.validateNode(node.right, depth + 1, state);
                break;
            case 'FunctionCall':
                this.validateFunctionCall(node.name, node.args.length, state.formula);
                for (const arg of node.args) {
                    this.validateNode(arg, depth + 1, state);
                }
                break;
            default: {
                const _exhaustive = node;
                throw new formula_errors_1.FormulaValidationError(`Nó de AST desconhecido: ${JSON.stringify(_exhaustive)}`, state.formula);
            }
        }
    }
    validateFunctionCall(name, argCount, formula) {
        if (!formula_types_1.ALLOWED_FUNCTIONS.has(name)) {
            throw new formula_errors_1.UnsupportedFormulaFunctionError(name, formula);
        }
        if (formula_types_1.AGGREGATE_FUNCTIONS.has(name)) {
            if (argCount !== 0) {
                throw new formula_errors_1.FormulaValidationError(`Função agregada "${name}" não aceita argumentos. ` +
                    `Use ${name}() sem argumentos — ela opera sobre os dados do período.`, formula);
            }
            return;
        }
        if (formula_types_1.MATH_FUNCTIONS.has(name)) {
            if (argCount !== 1) {
                throw new formula_errors_1.FormulaValidationError(`Função matemática "${name}" requer exatamente 1 argumento, ` +
                    `mas recebeu ${argCount}.`, formula);
            }
            return;
        }
        throw new formula_errors_1.UnsupportedFormulaFunctionError(name, formula);
    }
    validateBinaryOperator(operator, formula) {
        const allowed = new Set(['+', '-', '*', '/', '%']);
        if (!allowed.has(operator)) {
            throw new formula_errors_1.FormulaValidationError(`Operador binário "${operator}" não é permitido. ` +
                `Operadores válidos: +, -, *, /, %.`, formula);
        }
    }
    validateUnaryOperator(operator, formula) {
        const allowed = new Set(['+', '-']);
        if (!allowed.has(operator)) {
            throw new formula_errors_1.FormulaValidationError(`Operador unário "${operator}" não é permitido. ` +
                `Operadores válidos: +, -.`, formula);
        }
    }
};
exports.FormulaValidatorService = FormulaValidatorService;
exports.FormulaValidatorService = FormulaValidatorService = __decorate([
    (0, common_1.Injectable)()
], FormulaValidatorService);
//# sourceMappingURL=formula-validator.service.js.map