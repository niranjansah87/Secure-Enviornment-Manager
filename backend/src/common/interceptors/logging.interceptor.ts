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
          this.logger.log({
            msg: 'request completed',
            method,
            url: this.sanitizeUrl(url),
            status: reply.statusCode,
            duration: Date.now() - start,
            userId: req.user?.sub,
            orgId: req.user?.org,
            reqId: req.id,
          });
        },
        error: (err: Error) => {
          this.logger.error({
            msg: 'request failed',
            method,
            url: this.sanitizeUrl(url),
            duration: Date.now() - start,
            error: err.message,
            reqId: req.id,
          });
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
