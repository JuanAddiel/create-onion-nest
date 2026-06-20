import { Module } from '@nestjs/common';
import { GetHealthUseCase } from '../application/use-cases/get-health.use-case';
import { HealthRepository } from '../domain/repositories/health.repository';
import { InMemoryHealthRepository } from '../infrastructure/persistence/in-memory-health.repository';
import { HealthController } from './controllers/health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    {
      provide: HealthRepository,
      useClass: InMemoryHealthRepository,
    },
  ],
})
export class HealthModule {}
