import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

@Global()
@Module({
  providers: [EncryptionService, KeyManagementService],
  exports: [EncryptionService, KeyManagementService],
})
export class CryptoModule {}
