import { HealthStatus } from '../../domain/entities/health.entity';
import { HealthRepository } from '../../domain/repositories/health.repository';
import { GetHealthUseCase } from './get-health.use-case';

describe('GetHealthUseCase', () => {
  it('returns health status from the repository contract', async () => {
    const repository: HealthRepository = {
      async getStatus() {
        return new HealthStatus('ok', 'test-service');
      },
    };

    await expect(new GetHealthUseCase(repository).execute()).resolves.toEqual({
      status: 'ok',
      service: 'test-service',
    });
  });
});
