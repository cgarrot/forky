import { getAuthenticatedHttpClientOrThrow, requestApi } from '../core/api/api'

export type CodebaseMatch = {
  filePath: string
  lineNumber: number
  line: string
}

export type CodebaseSearchResponse = {
  matches: CodebaseMatch[]
}

export type CodebaseIndexResponse = {
  indexId: string
  rootPath: string
  fileCount: number
}

export async function codebaseSearchApi(params: {
  rootPath: string
  query: string
  maxResults?: number
  includeExtensions?: string[]
}): Promise<CodebaseSearchResponse> {
  const client = getAuthenticatedHttpClientOrThrow()
  return requestApi<CodebaseSearchResponse>(client.post('/codebase/search', params))
}

export async function codebaseIndexApi(params: {
  rootPath: string
  maxFiles?: number
  includeExtensions?: string[]
}): Promise<CodebaseIndexResponse> {
  const client = getAuthenticatedHttpClientOrThrow()
  return requestApi<CodebaseIndexResponse>(client.post('/codebase/index', params))
}
