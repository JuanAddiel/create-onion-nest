import { HealthStatus } from '../entities/health.entity';

export const HealthRepository = Symbol('HealthRepository');

export interface HealthRepository {
  getStatus(): Promise<HealthStatus>;
}
