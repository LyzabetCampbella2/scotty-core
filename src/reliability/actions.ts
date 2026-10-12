import { reliability } from './core';
export type Risk = 'read' | 'write' | 'sensitive';
export interface ProposedAction { id: string; agent: string; provider: string; operation: string; risk: Risk; payload: unknown }
export interface Approval { actionId: string; approved: boolean; approvedBy: string; expiresAt: number }
export class ActionGate {
  private approvals = new Map<string, Approval>();
  private completed = new Map<string, unknown>();
  approve(a: Approval) { this.approvals.set(a.actionId, a); }
  async execute<T>(action: ProposedAction, run: () => Promise<T>): Promise<T> {
    reliability.assertRunning();
    if (this.completed.has(action.id)) return this.completed.get(action.id) as T;
    if (action.risk !== 'read') {
      const approval = this.approvals.get(action.id);
      if (!approval?.approved || approval.expiresAt <= Date.now()) throw new Error('Explicit valid approval required');
      this.approvals.delete(action.id);
    }
    const result = await run();
    this.completed.set(action.id, result);
    return result;
  }
}
export const actionGate = new ActionGate();
