import { Controller, Headers, Param, Post } from '@nestjs/common';
import { GuestService } from './guest.service';

@Controller('guest')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post('start')
  start(@Headers('authorization') authorization?: string) {
    return this.guestService.start(authorization);
  }

  @Post('join/:shareToken')
  join(
    @Param('shareToken') shareToken: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.guestService.join(shareToken, authorization);
  }
}
