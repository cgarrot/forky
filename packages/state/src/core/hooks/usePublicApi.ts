'use client'

import { useMemo } from 'react'
import { getPublicApi, type ApiClient } from '../api/api'

export function usePublicApi(): ApiClient {
  return useMemo(() => getPublicApi(), [])
}
