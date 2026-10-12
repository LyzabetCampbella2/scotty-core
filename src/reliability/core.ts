export type Health = 'healthy' | 'degraded' | 'unavailable';
export type Service = 'voice' | 'eyes' | 'memory' | 'agents' | 'connectors';
export interface HealthRecord { service: Service; status: Health; checkedAt: number; detail?: string }
export class ReliabilityController {
  private health = new Map<Service, HealthRecord>();
  private stopped = false;
  private failures = new Map<Service, number>();
  report(service: Service, status: Health, detail?: string) {
    this.health.set(service, { service, status, detail, checkedAt: Date.now() });
    this.failures.set(service, status === 'healthy' ? 0 : (this.failures.get(service) ?? 0) + 1);
  }
  snapshot() { return { stopped: this.stopped, services: [...this.health.values()] }; }
  emergencyStop() { this.stopped = true; }
  resume() { this.stopped = false; }
  assertRunning() { if (this.stopped) throw new Error('Emergency stop active'); }
  retryDelay(service: Service) { return Math.min(30000, 500 * 2 ** Math.min(this.failures.get(service) ?? 0, 6)); }
}
export const reliability = new ReliabilityController();
