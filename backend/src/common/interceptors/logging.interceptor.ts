import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { JwtPayload } from '@sem/types';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: JwtPayload;
      id?: string;
    }>();

    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const reply = context.switchToHttp().getResponse<{ statusCode: number }>();
          const duration = Date.now() - start;
          const status = reply.statusCode;
          const cleanUrl = this.sanitizeUrl(url);
          const userMeta = req.user?.sub ? ` [user: ${req.user.sub.slice(0, 8)}...]` : '';
          const reqMeta = req.id ? ` (req: ${req.id})` : '';

          if (process.env['LOG_FORMAT'] === 'json') {
            this.logger.log({
              msg: 'request completed',
              method,
              url: cleanUrl,
              status,
              duration,
              userId: req.user?.sub,
              orgId: req.user?.org,
              reqId: req.id,
            });
          } else {
            this.logger.log(`${method} ${cleanUrl} ${status} +${duration}ms${userMeta}${reqMeta}`);
          }
        },
        error: (err: Error) => {
          const duration = Date.now() - start;
          const cleanUrl = this.sanitizeUrl(url);
          const reqMeta = req.id ? ` (req: ${req.id})` : '';

          if (process.env['LOG_FORMAT'] === 'json') {
            this.logger.error({
              msg: 'request failed',
              method,
              url: cleanUrl,
              duration,
              error: err.message,
              reqId: req.id,
            });
          } else {
            this.logger.error(`${method} ${cleanUrl} FAIL +${duration}ms - ${err.message}${reqMeta}`);
          }
        },
      }),
    );
  }

  /** Sanitize URL to avoid logging secret values in query strings. */
  private sanitizeUrl(url: string): string {
    // Strip query string entirely — might contain sensitive values
    return url.split('?')[0] ?? url;
  }
}
