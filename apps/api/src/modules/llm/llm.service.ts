import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { getAnthropicClient, getGlmClient, getOpenAIClient } from './clients'

type Provider = 'openai' | 'anthropic' | 'glm'

function getProviderForModel(modelId: string): Provider {
  const normalized = modelId.trim().toLowerCase()

  if (normalized.startsWith('gpt-')) return 'openai'
  if (normalized.startsWith('claude-')) return 'anthropic'
  if (normalized.startsWith('glm-') || normalized.startsWith('zhipu-')) return 'glm'

  throw new BadRequestException(`Unknown model: ${modelId}`)
}

@Injectable()
export class LlmService {
  getModel(modelId: string): unknown {
    const provider = getProviderForModel(modelId)

    switch (provider) {
      case 'glm': {
        const model = getGlmClient(modelId)
        if (!model) throw new ServiceUnavailableException('GLM not configured')
        return model
      }
      case 'anthropic': {
        const model = getAnthropicClient(modelId)
        if (!model) throw new ServiceUnavailableException('Anthropic not configured')
        return model
      }
      case 'openai':
      default: {
        const model = getOpenAIClient(modelId)
        if (!model) throw new ServiceUnavailableException('OpenAI not configured')
        return model
      }
    }
  }
}
