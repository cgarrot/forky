export type ModelProvider = 'openai' | 'anthropic' | 'glm';

export interface LLMModel {
  id: string;
  name: string;
  provider: ModelProvider;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1KTokens: number;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export const AVAILABLE_MODELS: Record<string, LLMModel> = {
  'glm-4.7': {
    id: 'glm-4.7',
    name: 'GLM-4.7',
    provider: 'glm',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1KTokens: 0.001,
  },
  'glm-4.6': {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    provider: 'glm',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1KTokens: 0.001,
  },
  'glm-4.5-flash': {
    id: 'glm-4.5-flash',
    name: 'GLM-4.5 Flash',
    provider: 'glm',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1KTokens: 0.001,
  },
  'glm-4-32B-0414-128K': {
    id: 'glm-4-32B-0414-128K',
    name: 'GLM-4 32B',
    provider: 'glm',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1KTokens: 0.001,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.005,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.00015,
  },
  'claude-3-5-sonnet-latest': {
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.003,
  },
  'claude-3-opus-latest': {
    id: 'claude-3-opus-latest',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.003,
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (legacy id)',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.003,
  },
  'claude-3.5-haiku': {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    costPer1KTokens: 0.001,
  },
};

const DEFAULT_MODEL_ID = 'glm-4.7';
const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * Get the model configuration for a specific model ID
 * @param modelId - The model ID
 * @returns Model configuration or undefined if not found
 */
export function getModelConfig(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS[modelId];
}

/**
 * Get the default model configuration
 * @returns Default model configuration
 */
export function getDefaultModel(): LLMModel {
  return AVAILABLE_MODELS[DEFAULT_MODEL_ID];
}

/**
 * Get all available models
 * @returns Array of all available models
 */
export function getAllModels(): LLMModel[] {
  return Object.values(AVAILABLE_MODELS);
}

/**
 * Get models by provider
 * @param provider - The model provider
 * @returns Array of models from the specified provider
 */
export function getModelsByProvider(provider: ModelProvider): LLMModel[] {
  return Object.values(AVAILABLE_MODELS).filter((model) => model.provider === provider);
}

/**
 * Get API key for a provider
 * @param provider - The model provider
 * @returns API key from environment
 */
export function getProviderApiKey(provider: ModelProvider): string | undefined {
  const env = process?.env || {};

  switch (provider) {
    case 'openai':
      return env.OPENAI_API_KEY;
    case 'anthropic':
      return env.ANTHROPIC_API_KEY;
    case 'glm':
      return env.GLM_API_KEY ?? env.ZHIPU_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if a provider is configured
 * @param provider - The model provider
 * @returns True if the provider has an API key configured
 */
export function isProviderConfigured(provider: ModelProvider): boolean {
  return !!getProviderApiKey(provider);
}

/**
 * Get LLM configuration for a specific model
 * @param modelId - The model ID
 * @returns LLM configuration
 * @throws Error if model not found or provider not configured
 */
export function getLLMConfig(modelId: string = DEFAULT_MODEL_ID): LLMConfig {
  const model = getModelConfig(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const apiKey = getProviderApiKey(model.provider);
  if (!apiKey) {
    throw new Error(`API key not configured for provider ${model.provider}`);
  }

  return {
    apiKey,
    baseUrl: getBaseUrl(model.provider),
    timeout: DEFAULT_TIMEOUT,
  };
}

/**
 * Get base URL for a provider
 * @param provider - The model provider
 * @returns Base URL or undefined
 */
function getBaseUrl(provider: ModelProvider): string | undefined {
  const env = process?.env || {};

  switch (provider) {
    case 'openai':
      return env.OPENAI_BASE_URL;
    case 'anthropic':
      return env.ANTHROPIC_BASE_URL;
    case 'glm':
      return env.GLM_BASE_URL ?? env.ZHIPU_BASE_URL;
    default:
      return undefined;
  }
}
