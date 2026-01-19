import { streamText } from 'ai'
import { getModelConfig } from '@forky/config'
import { getAnthropicClient, getGlmClient, getOpenAIClient } from '@/lib/llm/clients'

type LLMMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  try {
    const { messages, model, temperature = 0.7, maxTokens = 4096 } = (await request.json()) as {
      messages: LLMMessage[]
      model: string
      temperature?: number
      maxTokens?: number
    }

    const modelConfig = getModelConfig(model)
    if (!modelConfig) {
      return new Response(JSON.stringify({ error: `Unknown model: ${model}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let provider: ReturnType<typeof getGlmClient> | ReturnType<typeof getOpenAIClient> | ReturnType<typeof getAnthropicClient> | null

    switch (modelConfig.provider) {
      case 'glm':
        provider = getGlmClient(model)
        break
      case 'anthropic':
        provider = getAnthropicClient(model)
        break
      case 'openai':
      default:
        provider = getOpenAIClient(model)
        break
    }

    if (!provider) {
      const providerNames = {
        glm: 'GLM',
        anthropic: 'Anthropic',
        openai: 'OpenAI',
      }
      return new Response(
        JSON.stringify({
          error: `${providerNames[modelConfig.provider]} API key not configured. Add the API key to your .env.local file`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const systemMessage = messages.find((message) => message.role === 'system')
    const chatMessages = messages.filter((message) => message.role !== 'system')

    const result = streamText({
      model: provider,
      system: systemMessage?.content,
      messages: chatMessages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      temperature,
      maxOutputTokens: maxTokens,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    let userMessage = errorMessage
    if (errorMessage?.includes('API key')) {
      userMessage = 'Invalid or missing API key. Check your .env.local file'
    } else if (errorMessage?.includes('401')) {
      userMessage = 'Authentication error. Check your API keys.'
    } else if (errorMessage?.includes('429')) {
      userMessage = 'Rate limit exceeded. Wait a few seconds and try again.'
    } else if (errorMessage?.includes('timeout') || errorMessage?.includes('ECONNREFUSED')) {
      userMessage = 'Connection error. Check your internet connection.'
    } else {
      userMessage = 'Generation error. Please try again.'
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
