import { Module } from '@nestjs/common';
import { SecretsModule } from '../secrets/secrets.module';
import { TemplatesController } from './templates.controller';

@Module({ imports: [SecretsModule], controllers: [TemplatesController] })
export class TemplatesModule {}
