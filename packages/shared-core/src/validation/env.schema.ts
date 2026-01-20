import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url('Invalid database URL').optional(),
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  
  // API Keys
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required').optional(),
  OPENAI_BASE_URL: z.string().url('Invalid OpenAI base URL').optional(),

  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required').optional(),
  ANTHROPIC_BASE_URL: z.string().url('Invalid Anthropic base URL').optional(),

  GLM_API_KEY: z.string().min(1, 'GLM API key is required').optional(),
  GLM_BASE_URL: z.string().url('Invalid GLM base URL').optional(),

  ZHIPU_API_KEY: z.string().min(1, 'Zhipu API key is required').optional(),
  ZHIPU_BASE_URL: z.string().url('Invalid Zhipu base URL').optional(),
  
  // Collaboration
  COLLABORATION_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  WEBSOCKET_URL: z.string().url('Invalid WebSocket URL').optional(),
  
  // Storage
  STORAGE_TYPE: z.enum(['local', 's3', 'gcs']).default('local'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  // Analytics
  ANALYTICS_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  
  // Feature Flags
  VOICE_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  MULTIMODAL_ENABLED: z.string().transform((val) => val === 'true').default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  return envSchema.parse(env);
}

export function validateEnvSafe(
  env: Record<string, string | undefined>
): { success: true; data: EnvConfig } | { success: false; error: z.ZodError } {
  return envSchema.safeParse(env);
}
