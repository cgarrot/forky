'use client'

import { useMemo } from 'react'
import { getAuthenticatedApi, type ApiClient } from '../api/api'

export function useAuthenticatedApi(token?: string): ApiClient | null {
  return useMemo(() => getAuthenticatedApi(token), [token])
}
