import type { AxiosResponse, AxiosInstance } from 'axios'
import {
  createApi,
  createAuthenticatedApi,
  createApiHttpClient,
  getApiBaseUrl,
  type ApiClient,
} from '@forky/client-api'
import { ApiError, extractErrorMessage } from '../utils/errorUtils'

type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
  meta?: unknown
}

const AUTH_COOKIE_KEY = '__cookie_auth__'
const authClientCache = new Map<string, ApiClient>()
let publicClient: ApiClient | null = null

const authHttpClientCache = new Map<string, AxiosInstance>()
let publicHttpClient: AxiosInstance | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown }; message?: string } {
  return isRecord(error) && (error as { isAxiosError?: unknown }).isAxiosError === true
}

function extractErrorCode(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  const error = payload.error
  if (!isRecord(error)) return undefined
  return typeof error.code === 'string' && error.code.trim() ? error.code : undefined
}

function extractErrorFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  const error = payload.error
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }
  return fallback
}

function unwrapApiResponse<T>(payload: unknown, status?: number): T {
  if (payload === undefined || payload === null) {
    return payload as T
  }

  if (isRecord(payload) && 'success' in payload) {
    const success = payload.success
    if (success === true && 'data' in payload) {
      return (payload as ApiSuccess<T>).data
    }
    if (success === false) {
      const message = extractErrorFromPayload(payload, 'Request failed')
      const code = extractErrorCode(payload)
      throw new ApiError(message, status ?? 500, code)
    }
  }

  return payload as T
}

function resolveAuthCacheKey(token?: string): string | null {
  if (token && token.trim()) return token
  if (typeof window !== 'undefined') return AUTH_COOKIE_KEY
  return null
}

export function clearApiClientCache() {
  authClientCache.clear()
  publicClient = null
  authHttpClientCache.clear()
  publicHttpClient = null
}

export function getPublicApi(): ApiClient {
  if (!publicClient) {
    publicClient = createApi()
  }
  return publicClient
}

export function getAuthenticatedApi(token?: string): ApiClient | null {
  const key = resolveAuthCacheKey(token)
  if (!key) return null

  if (!authClientCache.has(key)) {
    const client = token && token.trim() ? createAuthenticatedApi(token) : createApi()
    authClientCache.set(key, client)
  }

  return authClientCache.get(key) ?? null
}

export function getAuthenticatedApiOrThrow(token?: string): ApiClient {
  const client = getAuthenticatedApi(token)
  if (!client) {
    throw new ApiError('Not authenticated', 401)
  }
  return client
}

export function getPublicHttpClient(): AxiosInstance {
  if (!publicHttpClient) {
    publicHttpClient = createApiHttpClient()
  }
  return publicHttpClient
}

export function getAuthenticatedHttpClient(token?: string): AxiosInstance | null {
  const key = resolveAuthCacheKey(token)
  if (!key) return null

  if (!authHttpClientCache.has(key)) {
    const client = createApiHttpClient(token && token.trim() ? token : undefined)
    authHttpClientCache.set(key, client)
  }

  return authHttpClientCache.get(key) ?? null
}

export function getAuthenticatedHttpClientOrThrow(token?: string): AxiosInstance {
  const client = getAuthenticatedHttpClient(token)
  if (!client) {
    throw new ApiError('Not authenticated', 401)
  }
  return client
}

export async function requestApi<T>(
  request: Promise<AxiosResponse<unknown>>,
  fallbackMessage = 'Request failed'
): Promise<T> {
  try {
    const response = await request
    return unwrapApiResponse<T>(response.data, response.status)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (isAxiosError(error)) {
      const status = error.response?.status ?? 500
      const message = extractErrorMessage(error, fallbackMessage)
      const code = extractErrorCode(error.response?.data)
      throw new ApiError(message, status, code)
    }
    if (error instanceof Error) {
      throw new ApiError(error.message || fallbackMessage, 500)
    }
    throw new ApiError(fallbackMessage, 500)
  }
}

export function createEventSource(path: string, init?: EventSourceInit): EventSource {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return new EventSource(path, {
      withCredentials: true,
      ...init,
    })
  }

  const normalizedPath = path.replace(/^\/+/, '')
  const base = getApiBaseUrl().replace(/\/+$/, '')
  const url = new URL(`${normalizedPath}`, `${base}/`).toString()
  return new EventSource(url, {
    withCredentials: true,
    ...init,
  })
}

export { getApiBaseUrl }
export type { ApiClient }
