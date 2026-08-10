"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_FUNCTIONS = exports.MATH_FUNCTIONS = exports.AGGREGATE_FUNCTIONS = exports.FORMULA_LIMITS = void 0;
exports.FORMULA_LIMITS = {
    MAX_FORMULA_LENGTH: 500,
    MAX_AST_DEPTH: 20,
    MAX_AST_NODES: 100,
    MAX_FUNCTION_ARGUMENTS: 10,
};
exports.AGGREGATE_FUNCTIONS = new Set([
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'LAST',
    'COUNT',
]);
exports.MATH_FUNCTIONS = new Set([
    'ABS',
    'ROUND',
    'FLOOR',
    'CEIL',
]);
exports.ALLOWED_FUNCTIONS = new Set([
    ...exports.AGGREGATE_FUNCTIONS,
    ...exports.MATH_FUNCTIONS,
]);
//# sourceMappingURL=formula.types.js.map