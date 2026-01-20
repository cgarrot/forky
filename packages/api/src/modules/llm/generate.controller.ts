import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { streamText } from 'ai';
import { Readable } from 'node:stream';
import { getModelConfig } from '@forky/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LlmService } from './llm.service';

type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GenerateBody = {
  messages?: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type StreamTextModel = Parameters<typeof streamText>[0]['model'];

@Controller('generate')
@UseGuards(JwtAuthGuard)
export class GenerateController {
  constructor(private readonly llm: LlmService) {}

  @Post()
  generate(@Body() body: GenerateBody, @Res() res: Response) {
    try {
      if (process.env.LLM_ENABLED && process.env.LLM_ENABLED !== 'true') {
        return res.status(403).json({ error: 'LLM disabled' });
      }

      const modelId = typeof body.model === 'string' ? body.model : '';
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const temperature =
        typeof body.temperature === 'number' ? body.temperature : 0.7;
      const maxTokens =
        typeof body.maxTokens === 'number' ? body.maxTokens : 4096;

      if (!modelId || !messages.length) {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      const modelConfig = getModelConfig(modelId);
      if (!modelConfig) {
        return res.status(400).json({ error: `Unknown model: ${modelId}` });
      }

      const model = this.llm.getModel(modelId) as StreamTextModel;

      const systemMessage = messages.find(
        (message) => message.role === 'system',
      );
      const chatMessages = messages.filter(
        (message) => message.role !== 'system',
      );

      const result = streamText({
        model,
        system: systemMessage?.content,
        messages: chatMessages.map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        })),
        temperature,
        maxOutputTokens: maxTokens,
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      const stream = Readable.from(result.textStream);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Generation error' });
        } else {
          res.end();
        }
      });
      stream.pipe(res);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      let userMessage = errorMessage;
      if (errorMessage?.includes('API key')) {
        userMessage =
          'Invalid or missing API key. Check your API configuration.';
      } else if (errorMessage?.includes('401')) {
        userMessage = 'Authentication error. Check your API keys.';
      } else if (errorMessage?.includes('429')) {
        userMessage = 'Rate limit exceeded. Wait a few seconds and try again.';
      } else if (
        errorMessage?.includes('timeout') ||
        errorMessage?.includes('ECONNREFUSED')
      ) {
        userMessage = 'Connection error. Check your internet connection.';
      } else {
        userMessage = 'Generation error. Please try again.';
      }

      return res.status(500).json({ error: userMessage });
    }
  }
}
