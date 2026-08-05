import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ok } from '../../common/response/api-response';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    description: 'Health check da API',
    schema: {
      example: {
        success: true,
        data: {
          status: 'ok',
          service: 'dataclarity-api',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  health() {
    return ok({
      status: 'ok',
      service: 'dataclarity-api',
      timestamp: new Date().toISOString(),
    });
  }
}
