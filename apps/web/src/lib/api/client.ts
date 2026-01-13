export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractErrorMessage(parsed: unknown, fallback: string): string {
  if (!isRecord(parsed)) return fallback

  const rawError = parsed.error

  if (typeof rawError === 'string' && rawError.trim()) {
    return rawError
  }

  if (isRecord(rawError) && typeof rawError.message === 'string' && rawError.message.trim()) {
    return rawError.message
  }

  return fallback
}

function maybeUnwrapSuccess<T>(parsed: unknown): T | null {
  if (!isRecord(parsed)) return null
  if (parsed.success !== true) return null
  if (!('data' in parsed)) return null
  return parsed.data as T
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    cache: 'no-store',
  })

  const rawText = await response.text()

  const parsed = rawText ? (tryParseJson(rawText) as unknown) : null

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(parsed, response.statusText), response.status)
  }

  const unwrapped = maybeUnwrapSuccess<T>(parsed)
  if (unwrapped !== null) {
    return unwrapped
  }

  if (parsed === null) {
    throw new ApiError('Empty response body', response.status)
  }

  return parsed as T
}
