import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorResponse, nowIso } from '../response/api-response';

type FieldError = { field?: string; message: string };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Loga exceções não-HTTP para facilitar debug (mantém resposta genérica para o cliente)

    if (!(exception instanceof HttpException)) {
      console.error(exception);
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = nowIso();
    const path = request.originalUrl || request.url;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: FieldError[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res) {
        const anyRes = res as Record<string, unknown>;
        if (typeof anyRes.message === 'string') {
          message = anyRes.message;
        } else if (Array.isArray(anyRes.message)) {
          message = 'Erro de validação';
          errors = (anyRes.message as unknown[])
            .filter((m): m is string => typeof m === 'string')
            .map((m) => ({ message: m }));
        }
      }

      if (
        statusCode === HttpStatus.UNAUTHORIZED &&
        message === 'Unauthorized'
      ) {
        message = 'Não autenticado';
      }
      if (statusCode === HttpStatus.FORBIDDEN && message === 'Forbidden') {
        message = 'Acesso negado';
      }
    }

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      errors,
      timestamp,
      path,
    };

    response.status(statusCode).json(payload);
  }
}
