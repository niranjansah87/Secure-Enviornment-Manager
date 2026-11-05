import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;
  readonly authAttemptsTotal: Counter;
  readonly authFailuresTotal: Counter;
  readonly secretOperationsTotal: Counter;
  readonly activeSessionsGauge: Gauge;
  readonly encryptionOperationsTotal: Counter;
  readonly rateLimitEventsTotal: Counter;
  readonly websocketConnectionsGauge: Gauge;
  readonly queueJobDuration: Histogram;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'sem_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'sem_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.authAttemptsTotal = new Counter({
      name: 'sem_auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['method', 'result'],
      registers: [this.registry],
    });

    this.authFailuresTotal = new Counter({
      name: 'sem_auth_failures_total',
      help: 'Total authentication failures',
      labelNames: ['method', 'reason'],
      registers: [this.registry],
    });

    this.secretOperationsTotal = new Counter({
      name: 'sem_secret_operations_total',
      help: 'Total secret operations',
      labelNames: ['operation'],  // create/update/delete/bulk/export — never env-level details
      registers: [this.registry],
    });

    this.activeSessionsGauge = new Gauge({
      name: 'sem_active_sessions',
      help: 'Number of active sessions',
      registers: [this.registry],
    });

    this.encryptionOperationsTotal = new Counter({
      name: 'sem_encryption_operations_total',
      help: 'Total encryption/decryption operations',
      labelNames: ['operation', 'result'],
      registers: [this.registry],
    });

    this.rateLimitEventsTotal = new Counter({
      name: 'sem_rate_limit_events_total',
      help: 'Total rate limit events',
      labelNames: ['endpoint'],
      registers: [this.registry],
    });

    this.websocketConnectionsGauge = new Gauge({
      name: 'sem_websocket_connections',
      help: 'Current WebSocket connections',
      registers: [this.registry],
    });

    this.queueJobDuration = new Histogram({
      name: 'sem_queue_job_duration_seconds',
      help: 'Queue job processing duration',
      labelNames: ['queue', 'job'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry, prefix: 'sem_node_' });
  }
}
