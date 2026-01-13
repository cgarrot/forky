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
      "Tu es un expert en synthèse. Ton but est de créer un résumé ultra-concis d'un texte structuré.\n\n" +
      'RÈGLES IMPORTANTES :\n' +
      '1. Commence par UNE SEULE phrase très courte (15-20 mots max) qui donne le contexte principal du texte.\n' +
      '2. Garde EXACTEMENT la même structure que le texte original (points numérotés, sections, sous-sections).\n' +
      '3. Réduis chaque point à son essence absolue (1-2 phrases maximum par point).\n' +
      '4. Supprime les exemples, les explications détaillées et le remplissage.\n' +
      '5. Garde les titres et sous-titres originaux mais rends-les ultra-courts.\n' +
      '6. Résume les idées en gardant le vocabulaire clé.\n\n' +
      "OBJECTIF : Transformer un texte de 4000+ caractères en un résumé qui conserve la structure et les idées clés, avec une phrase de contexte initiale.\n" +
      "Exemple de phrase introductive : 'Transformer un profil d'architecte en modèle viable'"

    const userPrompt = `Résume ce texte :\n\n${content}`

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
      userMessage = 'Clé API invalide ou manquante. Vérifiez votre fichier .env.local'
    } else if (errorMessage?.includes('401')) {
      userMessage = "Erreur d'authentification. Vérifiez vos clés API."
    } else if (errorMessage?.includes('429')) {
      userMessage = 'Limite de taux dépassée. Attendez quelques secondes et réessayez.'
    } else if (errorMessage?.includes('timeout') || errorMessage?.includes('ECONNREFUSED')) {
      userMessage = 'Erreur de connexion. Vérifiez votre connexion internet.'
    } else {
      userMessage = 'Erreur de génération du résumé.'
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
