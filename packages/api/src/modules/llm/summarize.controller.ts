import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { streamText } from 'ai';
import { Readable } from 'node:stream';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LlmService } from './llm.service';

type StreamTextModel = Parameters<typeof streamText>[0]['model'];

@Controller('summarize')
@UseGuards(JwtAuthGuard)
export class SummarizeController {
  constructor(private readonly llm: LlmService) {}

  @Post()
  summarize(@Body() body: { content?: string }, @Res() res: Response) {
    try {
      if (process.env.LLM_ENABLED && process.env.LLM_ENABLED !== 'true') {
        return res.status(403).json({ error: 'LLM disabled' });
      }

      const content = typeof body.content === 'string' ? body.content : '';
      if (!content.trim()) {
        return res.status(400).json({
          error: 'Content is required and must be a string',
        });
      }

      const model = this.llm.getModel('glm-4-32B-0414-128K') as StreamTextModel;

      const systemPrompt =
        'You are a synthesis expert. Your goal is to create an ultra-concise summary of a structured text.\n\n' +
        'IMPORTANT RULES:\n' +
        '1. Start with ONE very short sentence (15-20 words max) that gives the main context of the text.\n' +
        '2. Keep EXACTLY the same structure as the original text (numbered points, sections, subsections).\n' +
        '3. Reduce each point to its absolute essence (1-2 sentences maximum per point).\n' +
        '4. Remove examples, detailed explanations, and filler.\n' +
        '5. Keep original titles and subtitles but make them ultra-short.\n' +
        '6. Summarize ideas while keeping key vocabulary.\n\n' +
        'OBJECTIVE: Transform a 4000+ character text into a summary that preserves the structure and key ideas, with an initial context sentence.\n' +
        "Example introductory sentence: 'Transform an architect profile into a viable model'";

      const userPrompt = `Summarize this text:\n\n${content}`;

      const result = streamText({
        model,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        maxOutputTokens: 200,
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      const stream = Readable.from(result.textStream);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Summary generation error.' });
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
        userMessage = 'Summary generation error.';
      }

      return res.status(500).json({ error: userMessage });
    }
  }
}
