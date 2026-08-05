"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_1 = require("express");
const throttler_exception_filter_1 = require("./modules/health/throttler-exception.filter");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const env_schema_1 = require("./config/env.schema");
const app_module_1 = require("./app.module");
const app_swagger_1 = require("./app.swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const env = env_schema_1.envSchema.parse(process.env);
    app.setGlobalPrefix('/api/v1');
    app.enableCors({
        origin: env.FRONTEND_URL,
        credentials: true,
    });
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, express_1.json)({ limit: '200kb' }));
    app.use((0, express_1.urlencoded)({
        limit: '200kb',
        extended: true,
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter(), new throttler_exception_filter_1.ThrottlerExceptionFilter());
    (0, app_swagger_1.setupSwagger)(app);
    await app.listen(env.PORT);
}
void bootstrap();
//# sourceMappingURL=main.js.map