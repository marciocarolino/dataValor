import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(24).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_SECRET: z.string().min(24).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  // SMTP — e-mail transacional
  SMTP_HOST: z.string().min(1).default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('DataClarity <noreply@dataclarity.com.br>'),
});

export type Env = z.infer<typeof envSchema>;
