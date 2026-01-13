import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'

type ErrorBody = {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
  path: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeMessage(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value
  return 'An error occurred'
}

function mapCode(params: { status: number; message: string }): string {
  const { status, message } = params

  const normalized = message.toLowerCase()

  if (status === HttpStatus.BAD_REQUEST) {
    if (normalized.includes('password') && (normalized.includes('must match') || normalized.includes('matches'))) {
      return 'WEAK_PASSWORD'
    }
    return 'VALIDATION_ERROR'
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    if (message.toLowerCase().includes('invalid credentials')) return 'INVALID_CREDENTIALS'
    return 'UNAUTHORIZED'
  }

  if (status === HttpStatus.FORBIDDEN) {
    return 'ACCESS_DENIED'
  }

  if (status === HttpStatus.NOT_FOUND) {
    if (message.toLowerCase().includes('project')) return 'PROJECT_NOT_FOUND'
    if (message.toLowerCase().includes('node')) return 'NODE_NOT_FOUND'
    if (message.toLowerCase().includes('member')) return 'MEMBER_NOT_FOUND'
    if (message.toLowerCase().includes('user')) return 'USER_NOT_FOUND'
    return 'NOT_FOUND'
  }

  if (status === HttpStatus.CONFLICT) {
    if (message.toLowerCase().includes('already member')) return 'USER_ALREADY_MEMBER'
    return 'CONFLICT'
  }

  if (status === HttpStatus.SERVICE_UNAVAILABLE) {
    return 'SERVICE_UNAVAILABLE'
  }

  return 'INTERNAL_ERROR'
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const timestamp = new Date().toISOString()
    const path = request.originalUrl || request.url || ''

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let details: Record<string, unknown> | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const payload = exception.getResponse()

      if (typeof payload === 'string') {
        message = normalizeMessage(payload)
      } else if (isRecord(payload)) {
        if (Array.isArray(payload.message)) {
          message = payload.message
            .map((item) => (typeof item === 'string' ? item : ''))
            .filter(Boolean)
            .join(', ')
        } else if (payload.message !== undefined) {
          message = normalizeMessage(payload.message)
        } else {
          message = normalizeMessage(payload.error)
        }

        if (isRecord(payload.details)) {
          details = payload.details
        }

        if (typeof payload.code === 'string' && payload.code.trim()) {
          const explicitCode = payload.code.trim()

          const body: ErrorBody = {
            success: false,
            error: {
              code: explicitCode,
              message,
              ...(details ? { details } : {}),
            },
            timestamp,
            path,
          }

          response.status(status).json(body)
          return
        }
      }

      if (!message) {
        message = exception.message || 'An error occurred'
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const code = mapCode({ status, message })

    const body: ErrorBody = {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      timestamp,
      path,
    }

    response.status(status).json(body)
  }
}
