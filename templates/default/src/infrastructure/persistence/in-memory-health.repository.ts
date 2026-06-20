import { Injectable } from '@nestjs/common';
import { HealthStatus } from '../../domain/entities/health.entity';
import { HealthRepository } from '../../domain/repositories/health.repository';

@Injectable()
export class InMemoryHealthRepository implements HealthRepository {
  async getStatus(): Promise<HealthStatus> {
    return new HealthStatus('ok', '__PROJECT_NAME__');
  }
}
