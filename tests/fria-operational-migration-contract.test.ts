import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync('supabase/migrations/20260722120000_fria_operational_workflow_hardening.sql', 'utf8');
const legal = readFileSync('supabase/migrations/20260722120500_fria_legal_review_and_compensation_hardening.sql', 'utf8');
const evidenceGate = readFileSync('supabase/migrations/20260722121000_fria_approval_evidence_gate.sql', 'utf8');
const sql = `${base}\n${legal}\n${evidenceGate}`;

describe('FRIA operational migration contract', () => {
  it('binds assessments to a system in the same organization', () => {
    expect(sql).toContain('ai_systems_organization_id_id_uidx');
    expect(sql).toContain('foreign key (organization_id, ai_system_id)');
    expect(sql).toContain('references public.ai_systems(organization_id, id)');
    expect(sql).toContain('on delete restrict');
  });

  it('enforces actor membership including the legal reviewer', () => {
    expect(legal).toContain('new.legal_reviewer_id');
    expect(sql).toContain('public.organization_members');
    expect(legal).toContain('fria_user_not_organization_member');
    expect(legal).toContain('enforce_fria_assessment_member_scope');
    expect(base).toContain('enforce_fria_evidence_member_scope');
    expect(base).toContain('enforce_fria_decision_member_scope');
  });

  it('provides authenticated read-only RLS and blocks direct writes', () => {
    for (const table of ['ai_fria_assessments', 'ai_fria_evidence', 'ai_fria_decisions']) {
      expect(base).toContain(`grant select on public.${table} to authenticated`);
      expect(base).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
    expect(base).toContain('Organization members can read FRIA assessments');
    expect(base).toContain('Organization members can read FRIA evidence');
    expect(base).toContain('Organization members can read FRIA decisions');
  });

  it('serializes version creation and restricts RPC execution', () => {
    expect(base).toContain('create_fria_assessment_atomic');
    expect(base).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(base).toContain('coalesce(max(existing.version), 0) + 1');
    expect(base).toContain('grant execute on function public.create_fria_assessment_atomic');
    expect(base).toContain('to service_role');
    expect(base).toContain('from authenticated');
  });

  it('uses optimistic concurrency and recorded approver identity', () => {
    expect(evidenceGate).toContain('p_expected_updated_at timestamptz');
    expect(evidenceGate).toContain('v_current.updated_at is distinct from p_expected_updated_at');
    expect(evidenceGate).toContain('v_current.approver_id is distinct from p_actor_user_id');
    expect(evidenceGate).toContain("return query select 'state_changed'");
    expect(evidenceGate).toContain("return query select 'approver_required'");
  });

  it('requires accountable legal review for non-applicability and severe residual impact', () => {
    expect(legal).toContain('legal_reviewer_id uuid');
    expect(legal).toContain('ai_fria_legal_review_actor_required');
    expect(evidenceGate).toContain("v_current.applicability = 'not_required'");
    expect(evidenceGate).toContain("v_current.highest_residual_impact in ('high', 'critical')");
    expect(evidenceGate).toContain('v_current.legal_review_completed_at is null');
  });

  it('requires usable evidence for every required control', () => {
    expect(evidenceGate).toContain('v_required_control_ids');
    expect(evidenceGate).toContain('pg_catalog.unnest(v_required_control_ids)');
    expect(evidenceGate).toContain('public.ai_fria_evidence');
    expect(evidenceGate).toContain("evidence_record.status in ('submitted', 'accepted')");
    expect(evidenceGate).toContain('evidence_record.organization_id = p_organization_id');
    expect(evidenceGate).toContain('evidence_record.assessment_id = p_assessment_id');
  });

  it('persists approval and decision atomically', () => {
    expect(evidenceGate).toContain("stage = 'approved'");
    expect(evidenceGate).toContain('insert into public.ai_fria_decisions');
    expect(evidenceGate).toContain("'approved'");
    expect(evidenceGate).toContain('returning id into v_decision_id');
  });

  it('compensates only the exact approved state and decision', () => {
    expect(legal).toContain('compensate_fria_approval_audit_failure');
    expect(legal).toContain('p_approved_updated_at');
    expect(legal).toContain('decision_record.id = p_decision_id');
    expect(legal).toContain("set_config('app.fria_preserve_updated_at', 'on', true)");
    expect(legal).toContain('updated_at = p_previous_updated_at');
    expect(legal).not.toContain('disable trigger');
  });
});
