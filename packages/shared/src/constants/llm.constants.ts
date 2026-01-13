export const DEFAULT_MODEL = 'glm-4.7';
export const DEFAULT_TEMPERATURE = 0.7;
export const MAX_TOKENS = 4000;
export const MAX_PROMPT_LENGTH = 8000;

export type ModelProvider = 'openai' | 'anthropic' | 'glm';

export interface LLMModel {
  id: string;
  name: string;
  provider: ModelProvider;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1KTokens: number;
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

export const DEFAULT_GENERATION_TIMEOUT = 60000; // 60 seconds
export const STREAM_CHUNK_SIZE = 1024; // bytes
