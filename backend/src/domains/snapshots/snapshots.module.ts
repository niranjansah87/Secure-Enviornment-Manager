import { Module } from '@nestjs/common';
import { EnvironmentsModule } from '../environments/environments.module';
import { SnapshotsService } from './snapshots.service';

@Module({
  imports: [EnvironmentsModule],
  providers: [SnapshotsService],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
