import { Module } from '@nestjs/common';
import { HealthModule } from './presentation/health.module';

@Module({
  imports: [HealthModule]
})
export class AppModule {}
