"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivisionByZeroError = exports.FormulaEvaluationError = exports.FormulaLimitExceededError = exports.UnsupportedFormulaFunctionError = exports.FormulaValidationError = exports.FormulaSyntaxError = exports.FormulaError = void 0;
class FormulaError extends Error {
    formula;
    constructor(message, formula) {
        super(message);
        this.formula = formula;
        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.FormulaError = FormulaError;
class FormulaSyntaxError extends FormulaError {
    position;
    constructor(message, formula, position) {
        super(message, formula);
        this.position = position;
    }
}
exports.FormulaSyntaxError = FormulaSyntaxError;
class FormulaValidationError extends FormulaError {
    constructor(message, formula) {
        super(message, formula);
    }
}
exports.FormulaValidationError = FormulaValidationError;
class UnsupportedFormulaFunctionError extends FormulaValidationError {
    functionName;
    constructor(functionName, formula) {
        super(`Função "${functionName}" não é suportada. ` +
            `Funções permitidas: SUM, AVG, MIN, MAX, LAST, COUNT, ABS, ROUND, FLOOR, CEIL.`, formula);
        this.functionName = functionName;
    }
}
exports.UnsupportedFormulaFunctionError = UnsupportedFormulaFunctionError;
class FormulaLimitExceededError extends FormulaValidationError {
    limitName;
    limitValue;
    actualValue;
    constructor(limitName, limitValue, actualValue, formula) {
        super(`Limite "${limitName}" excedido: máximo ${limitValue}, atual ${actualValue}.`, formula);
        this.limitName = limitName;
        this.limitValue = limitValue;
        this.actualValue = actualValue;
    }
}
exports.FormulaLimitExceededError = FormulaLimitExceededError;
class FormulaEvaluationError extends FormulaError {
    constructor(message, formula) {
        super(message, formula);
    }
}
exports.FormulaEvaluationError = FormulaEvaluationError;
class DivisionByZeroError extends FormulaEvaluationError {
    constructor(formula) {
        super('Divisão por zero detectada na fórmula.', formula);
    }
}
exports.DivisionByZeroError = DivisionByZeroError;
//# sourceMappingURL=formula.errors.js.map