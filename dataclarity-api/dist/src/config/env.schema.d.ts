import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_SECRET: z.ZodOptional<z.ZodString>;
    JWT_REFRESH_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    FRONTEND_URL: z.ZodDefault<z.ZodString>;
    ADMIN_EMAIL: z.ZodOptional<z.ZodString>;
    ADMIN_PASSWORD: z.ZodOptional<z.ZodString>;
    SMTP_HOST: z.ZodDefault<z.ZodString>;
    SMTP_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    SMTP_SECURE: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    SMTP_USER: z.ZodOptional<z.ZodString>;
    SMTP_PASS: z.ZodOptional<z.ZodString>;
    SMTP_FROM: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
