import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { streamText } from 'ai';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GenerateTitleDto } from './dto/generate-title.dto';
import { LlmService } from './llm.service';

type StreamTextModel = Parameters<typeof streamText>[0]['model'];

@Controller('generate-title')
@UseGuards(JwtAuthGuard)
export class GenerateTitleController {
  constructor(private readonly llm: LlmService) {}

  @Post()
  async generate(@Body() dto: GenerateTitleDto) {
    const modelId = dto.model ?? 'glm-4.7';

    const systemPrompt =
      'You are an expert in creating short and catchy titles.\n\n' +
      'IMPORTANT RULES:\n' +
      '1. Generate ONE short and descriptive title in English (5-10 words maximum).\n' +
      '2. The title must capture the essence of the content.\n' +
      "3. Avoid generic words like 'Project', 'Analysis', 'Study'.\n" +
      '4. Use precise and professional vocabulary.\n' +
      '5. Start with a capital letter and do not add a period.\n\n' +
      'OBJECTIVE: Create a concise title that perfectly summarizes the subject matter.';

    const userPrompt = `Generate a short and descriptive title (5-10 words maximum) in English for this content:\n\nPrompt: ${dto.prompt}\n\nResponse: ${dto.response}`;

    const model = this.llm.getModel(modelId) as StreamTextModel;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3,
      maxOutputTokens: 50,
    });

    let title = '';
    for await (const delta of result.textStream) {
      title += String(delta);
    }

    return {
      success: true,
      data: {
        title: title.trim(),
      },
      message: 'Title generated',
    };
  }
}
