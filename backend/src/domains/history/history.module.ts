import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { SecretsModule } from '../secrets/secrets.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { EnvironmentHistoryController } from './environment-history.controller';

@Module({
  imports: [SecretsModule, SnapshotsModule],
  controllers: [HistoryController, EnvironmentHistoryController],
})
export class HistoryModule {}
