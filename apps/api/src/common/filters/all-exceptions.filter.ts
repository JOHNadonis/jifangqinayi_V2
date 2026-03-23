import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorLogService } from '../../modules/logs/error-log.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private errorLogService: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    // only log 5xx errors
    if (status >= 500) {
      const user = (request as any).user;
      this.errorLogService.record({
        userId: user?.sub,
        username: user?.username,
        method: request.method,
        path: request.url,
        statusCode: status,
        message: Array.isArray(message) ? message.join('; ') : String(message),
        stack,
      });
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
