export class HealthStatus {
  constructor(
    public readonly status: 'ok',
    public readonly service: string
  ) {}
}
