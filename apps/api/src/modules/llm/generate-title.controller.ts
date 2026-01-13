import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { streamText } from 'ai'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GenerateTitleDto } from './dto/generate-title.dto'
import { LlmService } from './llm.service'

type StreamTextModel = Parameters<typeof streamText>[0]['model']

@Controller('generate-title')
@UseGuards(JwtAuthGuard)
export class GenerateTitleController {
  constructor(private readonly llm: LlmService) {}

  @Post()
  async generate(@Body() dto: GenerateTitleDto) {
    const modelId = dto.model ?? 'glm-4.7'

    const systemPrompt =
      'Tu es un expert en création de titres courts et accrocheurs.\n\n' +
      'RÈGLES IMPORTANTES :\n' +
      '1. Génère UN titre court et descriptif en français (5-10 mots maximum).\n' +
      "2. Le titre doit capturer l'essence du contenu.\n" +
      "3. Évite les mots génériques comme 'Projet', 'Analyse', 'Étude'.\n" +
      '4. Utilise un vocabulaire précis et professionnel.\n' +
      '5. Commence par une majuscule et ne mets pas de point final.\n\n' +
      'OBJECTIF : Créer un titre concis qui résume parfaitement le sujet traité.'

    const userPrompt = `Génère un titre court et descriptif (5-10 mots maximum) en français pour ce contenu :\n\nPrompt: ${dto.prompt}\n\nRéponse: ${dto.response}`

    const model = this.llm.getModel(modelId) as unknown as StreamTextModel

    const result = streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3,
      maxOutputTokens: 50,
    })

    let title = ''
    for await (const delta of result.textStream) {
      title += String(delta)
    }

    return {
      success: true,
      data: {
        title: title.trim(),
      },
      message: 'Titre généré',
    }
  }
}
