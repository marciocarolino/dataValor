"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaEvaluatorService = void 0;
const common_1 = require("@nestjs/common");
const formula_errors_1 = require("./formula.errors");
let FormulaEvaluatorService = class FormulaEvaluatorService {
    evaluate(ast, context, formula) {
        const result = this.evalNode(ast, context, formula);
        this.assertFinite(result, formula);
        return result;
    }
    evalNode(node, context, formula) {
        switch (node.kind) {
            case 'NumberLiteral':
                return node.value;
            case 'UnaryExpression': {
                const operand = this.evalNode(node.operand, context, formula);
                if (node.operator === '-')
                    return -operand;
                return operand;
            }
            case 'BinaryExpression': {
                const left = this.evalNode(node.left, context, formula);
                const right = this.evalNode(node.right, context, formula);
                return this.evalBinary(node.operator, left, right, formula);
            }
            case 'FunctionCall':
                return this.evalFunction(node.name, node.args, context, formula);
            default: {
                const _exhaustive = node;
                throw new formula_errors_1.FormulaEvaluationError(`Nó de AST desconhecido durante avaliação: ${JSON.stringify(_exhaustive)}`, formula);
            }
        }
    }
    evalBinary(operator, left, right, formula) {
        switch (operator) {
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '*':
                return left * right;
            case '/':
                if (right === 0)
                    throw new formula_errors_1.DivisionByZeroError(formula);
                return left / right;
            case '%':
                if (right === 0)
                    throw new formula_errors_1.DivisionByZeroError(formula);
                return left % right;
            default:
                throw new formula_errors_1.FormulaEvaluationError(`Operador binário desconhecido: "${operator}".`, formula);
        }
    }
    evalFunction(name, args, context, formula) {
        switch (name) {
            case 'SUM':
                return this.requireAggregate(context.aggregates.SUM, 'SUM', formula);
            case 'AVG':
                return this.requireAggregate(context.aggregates.AVG, 'AVG', formula);
            case 'MIN':
                return this.requireAggregate(context.aggregates.MIN, 'MIN', formula);
            case 'MAX':
                return this.requireAggregate(context.aggregates.MAX, 'MAX', formula);
            case 'LAST':
                return this.requireAggregate(context.aggregates.LAST, 'LAST', formula);
            case 'COUNT':
                return context.aggregates.COUNT;
        }
        const arg0 = this.evalNode(args[0], context, formula);
        switch (name) {
            case 'ABS':
                return Math.abs(arg0);
            case 'ROUND':
                return Math.round(arg0);
            case 'FLOOR':
                return Math.floor(arg0);
            case 'CEIL':
                return Math.ceil(arg0);
        }
        throw new formula_errors_1.FormulaEvaluationError(`Função desconhecida durante avaliação: "${name}". ` +
            `O validator deve ter sido executado antes da avaliação.`, formula);
    }
    requireAggregate(value, functionName, formula) {
        if (value === null) {
            throw new formula_errors_1.FormulaEvaluationError(`A função ${functionName}() retornou null — o período não possui medições válidas. ` +
                `Não é possível calcular a fórmula sem dados.`, formula);
        }
        return value;
    }
    assertFinite(value, formula) {
        if (isNaN(value)) {
            throw new formula_errors_1.FormulaEvaluationError(`O resultado da fórmula é NaN (Not a Number). ` +
                `Verifique se todas as operações da fórmula são válidas com os dados do período.`, formula);
        }
        if (!isFinite(value)) {
            throw new formula_errors_1.FormulaEvaluationError(`O resultado da fórmula é Infinity. ` +
                `Verifique se há divisão por zero ou overflow de valores.`, formula);
        }
    }
};
exports.FormulaEvaluatorService = FormulaEvaluatorService;
exports.FormulaEvaluatorService = FormulaEvaluatorService = __decorate([
    (0, common_1.Injectable)()
], FormulaEvaluatorService);
//# sourceMappingURL=formula-evaluator.service.js.map