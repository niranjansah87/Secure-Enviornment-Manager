import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [SecretsModule],
  controllers: [HistoryController],
})
export class HistoryModule {}
