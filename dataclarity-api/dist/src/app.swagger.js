"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_1 = require("@nestjs/swagger");
const setupSwagger = (app) => {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('DataValor API')
        .setDescription('API principal da plataforma DataValor para gestão comercial, serviços e processamento de dados.')
        .setVersion('1.0.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
    }, 'access-token')
        .addTag('Health')
        .addTag('Authentication')
        .addTag('Contacts')
        .addTag('Quote Requests')
        .addTag('Services')
        .addTag('Users')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    const customOptions = {
        customSiteTitle: 'DataValor API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    };
    swagger_1.SwaggerModule.setup('/api/docs', app, document, customOptions);
};
exports.setupSwagger = setupSwagger;
//# sourceMappingURL=app.swagger.js.map