function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractMessageFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback

  const error = payload.error
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error
  }

  return fallback
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number }; message?: string } {
  return isRecord(error) && (error as { isAxiosError?: unknown }).isAxiosError === true
}

export function extractErrorMessage(error: unknown, fallbackMessage = 'An error occurred'): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (isAxiosError(error)) {
    const message = extractMessageFromPayload(error.response?.data, error.message || fallbackMessage)
    return message || fallbackMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

function extractStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status
  if (isAxiosError(error)) return error.response?.status
  return undefined
}

export function createApiErrorHandler(defaultMessage: string) {
  return (error: unknown): string => {
    const status = extractStatus(error)

    if (status === 401) return 'Authentication required'
    if (status === 403) return 'Access denied'
    if (status === 400) return extractErrorMessage(error, defaultMessage)
    if (status === 500) return 'Server error'
    if (typeof status === 'number' && status >= 500) return 'Server unavailable'

    return extractErrorMessage(error, defaultMessage)
  }
}
