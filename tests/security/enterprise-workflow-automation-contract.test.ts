import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createWorkflowState, transitionWorkflow } from '@/lib/enterprise/workflow-engine';

const migration = readFileSync('supabase/migrations/20260721093000_enterprise_workflow_automation.sql', 'utf8');

describe('enterprise workflow automation contract', () => {
  it('forces RLS on every workflow table and keeps material history append-only', () => {
    const tables = ['templates','steps','instances','step_runs','approvals','events','escalations'];
    for (const table of tables) {
      expect(migration).toContain(`enterprise_workflow_${table} force row level security`);
    }
    expect(migration).toContain('revoke update, delete on public.enterprise_workflow_events');
    expect(migration).toContain('revoke update, delete on public.enterprise_workflow_approvals');
  });

  it('requires separation of duties for active templates', () => {
    expect(migration).toContain('approved_by <> created_by');
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain('approved_at is not null');
  });

  it('supports deterministic multi-level approval and completion', () => {
    const definitions = [
      { key: 'collect', sequence: 1, type: 'task' as const, requiredApprovals: 1, slaMinutes: 60 },
      { key: 'approve', sequence: 2, type: 'approval' as const, requiredApprovals: 2, slaMinutes: 120 },
    ];
    let state = createWorkflowState(definitions, '2026-07-21T09:00:00.000Z', 300);
    state = transitionWorkflow(state, definitions, { type: 'START', at: '2026-07-21T09:00:00.000Z' });
    state = transitionWorkflow(state, definitions, { type: 'COMPLETE_STEP', stepKey: 'collect', at: '2026-07-21T09:10:00.000Z' });
    expect(state.status).toBe('waiting_approval');
    state = transitionWorkflow(state, definitions, { type: 'APPROVE', stepKey: 'approve', at: '2026-07-21T09:20:00.000Z' });
    expect(state.status).toBe('waiting_approval');
    state = transitionWorkflow(state, definitions, { type: 'APPROVE', stepKey: 'approve', at: '2026-07-21T09:30:00.000Z' });
    expect(state.status).toBe('completed');
  });

  it('fails closed when an approval is rejected or workflow deadline expires', () => {
    const definitions = [{ key: 'approve', sequence: 1, type: 'approval' as const, requiredApprovals: 1, slaMinutes: 10 }];
    let state = createWorkflowState(definitions, '2026-07-21T09:00:00.000Z', 20);
    state = transitionWorkflow(state, definitions, { type: 'START', at: '2026-07-21T09:00:00.000Z' });
    expect(transitionWorkflow(state, definitions, { type: 'REJECT', stepKey: 'approve', at: '2026-07-21T09:01:00.000Z' }).status).toBe('failed');
    expect(transitionWorkflow(state, definitions, { type: 'TICK', at: '2026-07-21T09:30:00.000Z' }).status).toBe('expired');
  });
});
