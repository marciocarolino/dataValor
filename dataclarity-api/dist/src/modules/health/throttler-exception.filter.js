"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottlerExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const api_response_1 = require("../../common/response/api-response");
let ThrottlerExceptionFilter = class ThrottlerExceptionFilter {
    catch(_exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const payload = {
            success: false,
            statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
            message: 'Muitas requisições. Tente novamente em alguns instantes.',
            errors: [],
            timestamp: (0, api_response_1.nowIso)(),
            path: request.originalUrl || request.url,
        };
        response.status(payload.statusCode).json(payload);
    }
};
exports.ThrottlerExceptionFilter = ThrottlerExceptionFilter;
exports.ThrottlerExceptionFilter = ThrottlerExceptionFilter = __decorate([
    (0, common_1.Catch)(throttler_1.ThrottlerException)
], ThrottlerExceptionFilter);
//# sourceMappingURL=throttler-exception.filter.js.map