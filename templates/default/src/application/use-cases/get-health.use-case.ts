import { Inject, Injectable } from '@nestjs/common';
import { HealthRepository } from '../../domain/repositories/health.repository';

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(HealthRepository)
    private readonly healthRepository: HealthRepository,
  ) {}

  execute() {
    return this.healthRepository.getStatus();
  }
}
