import { createParamDecorator, ExecutionContext } from '@nestjs/common'

type AuthenticatedUser = {
  sub: string
  email: string
  username?: string
  avatar?: string | null
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    if (!request.user) {
      return { sub: '', email: '' }
    }
    return request.user
  }
)
