import { getPublicApi, requestApi } from '../core/api/api'

export type GuestStartResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  projectId: string
  shareToken: string | null
}

export type GuestJoinResponse = {
  projectId: string
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

export async function guestStartApi(): Promise<GuestStartResponse> {
  const api = getPublicApi()
  return requestApi<GuestStartResponse>(api.guest.guestControllerStart(''))
}

export async function guestJoinApi(shareToken: string): Promise<GuestJoinResponse> {
  const api = getPublicApi()
  return requestApi<GuestJoinResponse>(api.guest.guestControllerJoin(shareToken, ''))
}
