import { getAuthenticatedApiOrThrow, requestApi } from '../core/api/api'

export type GenerateTitleResponse = {
  title: string
}

export async function generateTitleApi(params: { prompt: string; response: string }): Promise<GenerateTitleResponse> {
  const api = getAuthenticatedApiOrThrow()
  return requestApi<GenerateTitleResponse>(
    api.generateTitle.generateTitleControllerGenerate({
      prompt: params.prompt,
      response: params.response,
    })
  )
}
