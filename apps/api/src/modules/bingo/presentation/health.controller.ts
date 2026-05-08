import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  health() {
    return {
      name: 'Bingo Familiar Premium API',
      status: 'ok',
      time: new Date().toISOString(),
    };
  }
}
