import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),

  GLM_API_KEY: z.string().min(1).optional(),
  GLM_BASE_URL: z.string().url().optional(),

  ZHIPU_API_KEY: z.string().min(1).optional(),
  ZHIPU_BASE_URL: z.string().url().optional(),

  COLLABORATION_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  WEBSOCKET_URL: z.string().url().optional(),

  STORAGE_TYPE: z.enum(['local', 's3', 'gcs']).default('local'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),

  ANALYTICS_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  VOICE_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  MULTIMODAL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let envCache: EnvConfig | null = null;

/**
 * Get the validated environment configuration
 * @returns Validated environment configuration
 */
export function getEnv(): EnvConfig {
  if (envCache) {
    return envCache;
  }

  const env = process?.env || {};
  const parsed = envSchema.parse(env);
  envCache = parsed;
  return parsed;
}

/**
 * Validate environment variables
 * @returns Validation result
 */
export function validateEnv(): { success: true; data: EnvConfig } | { success: false; error: z.ZodError } {
  const env = process?.env || {};
  return envSchema.safeParse(env);
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}
