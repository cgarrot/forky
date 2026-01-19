import { streamText } from 'ai'
import { getGlmClient } from '@/lib/llm/clients'

export async function POST(request: Request) {
  try {
    const { content } = (await request.json()) as { content: string }

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required and must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const provider = getGlmClient('glm-4-32B-0414-128K')

    if (!provider) {
      return new Response(
        JSON.stringify({
          error: 'GLM not available. Check your GLM API key.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const systemPrompt =
      "You are a synthesis expert. Your goal is to create an ultra-concise summary of a structured text.\n\n" +
      'IMPORTANT RULES:\n' +
      '1. Start with ONE very short sentence (15-20 words max) that gives the main context of the text.\n' +
      '2. Keep EXACTLY the same structure as the original text (numbered points, sections, subsections).\n' +
      '3. Reduce each point to its absolute essence (1-2 sentences maximum per point).\n' +
      '4. Remove examples, detailed explanations, and filler.\n' +
      '5. Keep original titles and subtitles but make them ultra-short.\n' +
      '6. Summarize ideas while keeping key vocabulary.\n\n' +
      "OBJECTIVE: Transform a 4000+ character text into a summary that preserves the structure and key ideas, with an initial context sentence.\n" +
      "Example introductory sentence: 'Transform an architect profile into a viable model'"

    const userPrompt = `Summarize this text:\n\n${content}`

    const result = streamText({
      model: provider,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 200,
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
      userMessage = 'Summary generation error.'
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
