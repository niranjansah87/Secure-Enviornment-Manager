import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MAINTENANCE_QUEUE } from './queue.constants';

@Injectable()
export class MaintenanceScheduler implements OnModuleInit {
  constructor(@Inject(MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await Promise.all([
      this.queue.upsertJobScheduler('cleanup-expired-sessions', { pattern: '0 * * * *' }, { name: 'cleanup-expired-sessions' }),
      this.queue.upsertJobScheduler('partition-audit', { pattern: '0 2 25 * *' }, { name: 'partition-audit' }),
      this.queue.upsertJobScheduler('rotate-dek', { pattern: '0 3 * * *' }, { name: 'rotate-dek' }),
    ]);
  }
}
