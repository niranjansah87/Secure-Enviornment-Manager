import { Module } from '@nestjs/common';
import { RemoteConfigController } from './remote-config.controller';
import { SecretsModule } from '../secrets/secrets.module';
import { ProjectsModule } from '../projects/projects.module';
import { EnvironmentsModule } from '../environments/environments.module';

@Module({
  imports: [SecretsModule, ProjectsModule, EnvironmentsModule],
  controllers: [RemoteConfigController],
})
export class RemoteConfigModule {}
