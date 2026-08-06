"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const api_response_1 = require("../response/api-response");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        if (!(exception instanceof common_1.HttpException)) {
            console.error(exception);
        }
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const timestamp = (0, api_response_1.nowIso)();
        const path = request.originalUrl || request.url;
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Erro interno do servidor';
        let errors = [];
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            }
            else if (typeof res === 'object' && res) {
                const anyRes = res;
                if (typeof anyRes.message === 'string') {
                    message = anyRes.message;
                }
                else if (Array.isArray(anyRes.message)) {
                    message = 'Erro de validação';
                    errors = anyRes.message
                        .filter((m) => typeof m === 'string')
                        .map((m) => ({ message: m }));
                }
            }
            if (statusCode === common_1.HttpStatus.UNAUTHORIZED &&
                message === 'Unauthorized') {
                message = 'Não autenticado';
            }
            if (statusCode === common_1.HttpStatus.FORBIDDEN && message === 'Forbidden') {
                message = 'Acesso negado';
            }
        }
        const payload = {
            success: false,
            statusCode,
            message,
            errors,
            timestamp,
            path,
        };
        response.status(statusCode).json(payload);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map