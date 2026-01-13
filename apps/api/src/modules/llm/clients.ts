import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const glmBaseUrl =
  process.env.GLM_BASE_URL ||
  process.env.ZHIPU_BASE_URL ||
  'https://api.z.ai/api/paas/v4';

const glmApiKey = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY || '';

const glm = createOpenAICompatible({
  name: 'glm',
  baseURL: glmBaseUrl,
  apiKey: glmApiKey,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export function getGlmClient(modelId: string): unknown | null {
  if (!glmApiKey) return null;
  return glm(modelId);
}

export function getOpenAIClient(modelId: string): unknown | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return openai(modelId);
}

export function getAnthropicClient(modelId: string): unknown | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return anthropicProvider(modelId);
}
