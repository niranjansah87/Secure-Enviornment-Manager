import { Module } from '@nestjs/common';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';
import { EnvironmentsModule } from '../environments/environments.module';
import { AuditModule } from '../audit/audit.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [EnvironmentsModule, AuditModule, SnapshotsModule],
  controllers: [SecretsController],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
