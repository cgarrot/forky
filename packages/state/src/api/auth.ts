import { getAuthenticatedApiOrThrow, getPublicApi, requestApi } from '../core/api/api'

export type LoginResponse = {
  user: unknown
  access_token: string
  refresh_token: string
  expires_in: number
}

export type RegisterResponse = {
  user: unknown
  access_token: string
  refresh_token: string
}

export type RefreshResponse = {
  access_token: string
  expires_in: number
}

export type LoginBody = {
  email: string
  password: string
}

export type RegisterBody = {
  email: string
  password: string
  username?: string
  firstName?: string
  lastName?: string
}

export async function loginApi(body: LoginBody): Promise<LoginResponse> {
  const api = getPublicApi()
  return requestApi<LoginResponse>(api.auth.authControllerLogin(body))
}

export async function registerApi(body: RegisterBody): Promise<RegisterResponse> {
  const api = getPublicApi()
  return requestApi<RegisterResponse>(api.auth.authControllerRegister(body))
}

export async function refreshApi(refreshToken: string): Promise<RefreshResponse> {
  const api = getPublicApi()
  return requestApi<RefreshResponse>(
    api.auth.authControllerRefresh({
      refresh_token: refreshToken,
    })
  )
}

export async function logoutApi(): Promise<void> {
  const api = getAuthenticatedApiOrThrow()
  await requestApi<void>(api.auth.authControllerLogout())
}
