/**
 * Global HTTP exception filter.
 * Produces consistent { error: { code, message } } shape.
 * NEVER leaks SQL, stack traces, encryption details, or internal paths.
 */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    // Log at appropriate level — never log token/password values
    if (status >= 500) {
      this.logger.error(`HTTP ${status}: ${exception.message}`);
    }

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;
      code = (b['code'] as string) ?? this.statusToCode(status);
      message = (b['message'] as string) ?? exception.message;
    } else if (typeof body === 'string') {
      message = body;
      code = this.statusToCode(status);
    }

    reply.status(status).send({ error: { code, message } });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
