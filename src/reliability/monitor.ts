import { reliability, type Service } from './core';
export interface Probe { service: Service; check: (signal: AbortSignal) => Promise<void>; timeoutMs?: number }
export class ServiceMonitor {
  private active = false;
  private timer?: ReturnType<typeof setInterval>;
  constructor(private probes: Probe[], private intervalMs = 15000) {}
  async checkAll() {
    if (this.active) return;
    this.active = true;
    try {
      await Promise.all(this.probes.map(async probe => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), probe.timeoutMs ?? 4000);
        try {
          await probe.check(controller.signal);
          reliability.report(probe.service, 'healthy');
        } catch (error) {
          reliability.report(probe.service, 'degraded', error instanceof Error ? error.message : 'Probe failed');
        } finally { clearTimeout(timeout); }
      }));
    } finally { this.active = false; }
  }
  start() { if (!this.timer) { void this.checkAll(); this.timer = setInterval(() => void this.checkAll(), this.intervalMs); this.timer.unref?.(); } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
}
