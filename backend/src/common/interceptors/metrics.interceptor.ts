import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../infra/observability/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics?: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.metrics) return next.handle();

    const req = context.switchToHttp().getRequest<{ method: string; routerPath?: string }>();
    const method = req.method;
    // Use router path (not raw URL) to avoid high-cardinality labels from IDs
    const route = req.routerPath ?? 'unknown';
    const end = this.metrics.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const reply = context.switchToHttp().getResponse<{ statusCode: number }>();
          const status = String(reply.statusCode);
          end({ status });
          this.metrics!.httpRequestsTotal.inc({ method, route, status });
        },
        error: () => {
          end({ status: '500' });
          this.metrics!.httpRequestsTotal.inc({ method, route, status: '500' });
        },
      }),
    );
  }
}
