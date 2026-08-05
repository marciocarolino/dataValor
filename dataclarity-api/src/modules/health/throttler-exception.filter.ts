import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ApiErrorResponse, nowIso } from '../../common/response/api-response';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const payload: ApiErrorResponse = {
      success: false,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Muitas requisições. Tente novamente em alguns instantes.',
      errors: [],
      timestamp: nowIso(),
      path: request.originalUrl || request.url,
    };

    response.status(payload.statusCode).json(payload);
  }
}
