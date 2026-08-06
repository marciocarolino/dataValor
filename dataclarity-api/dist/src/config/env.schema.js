"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3001),
    DATABASE_URL: zod_1.z.string().min(1).optional(),
    JWT_SECRET: zod_1.z.string().min(24).optional(),
    JWT_EXPIRES_IN: zod_1.z.string().min(1).default('15m'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(24).optional(),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().min(1).default('7d'),
    FRONTEND_URL: zod_1.z.string().url().default('http://localhost:4200'),
    ADMIN_EMAIL: zod_1.z.string().email().optional(),
    ADMIN_PASSWORD: zod_1.z.string().min(12).optional(),
    SMTP_HOST: zod_1.z.string().min(1).default('smtp.ethereal.email'),
    SMTP_PORT: zod_1.z.coerce.number().int().positive().default(587),
    SMTP_SECURE: zod_1.z
        .string()
        .transform((v) => v === 'true')
        .default(false),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().default('DataClarity <noreply@dataclarity.com.br>'),
});
//# sourceMappingURL=env.schema.js.map