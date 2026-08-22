import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionSource = fs.readFileSync('src/server/actions/onboarding.ts', 'utf8');
const reconciliationSource = fs.readFileSync(
  'supabase/migrations/20260822123616_v19_reconcile_active_onboarding_runtime.sql',
  'utf8',
);
const seatAuthoritySource = fs.readFileSync(
  'supabase/migrations/20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql',
  'utf8',
);
const hardeningSource = fs.readFileSync(
  'supabase/migrations/20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql',
  'utf8',
);
const completionSource = actionSource.slice(
  actionSource.indexOf('export async function completeOnboardingActivation'),
);

describe('atomic onboarding activation contract', () => {
  it('uses one public backend onboarding RPC instead of direct application multi-table writes', () => {
    expect(completionSource).toContain('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC');
    expect(completionSource).toContain("'organization:update'");
    expect(completionSource).toContain("'team:invite'");

    for (const table of [
      'ai_systems',
      'documents',
      'compliance_tasks',
      'invitations',
      'onboarding_activation_runs',
      'organizations',
    ]) {
      expect(completionSource).not.toContain(`.from('${table}')`);
    }
  });

  it('serializes the tenant and commits the reconciled completed state last', () => {
    const tenantLock = reconciliationSource.indexOf('for update;');
    const aiWrite = reconciliationSource.indexOf('insert into public.ai_systems');
    const documentWrite = reconciliationSource.indexOf('insert into public.documents');
    const taskWrite = reconciliationSource.indexOf('insert into public.compliance_tasks');
    const activationRunWrite = reconciliationSource.indexOf('insert into public.onboarding_activation_runs');
    const organizationCompletion = reconciliationSource.lastIndexOf('update public.organizations');

    expect(tenantLock).toBeGreaterThan(-1);
    expect(aiWrite).toBeGreaterThan(tenantLock);
    expect(documentWrite).toBeGreaterThan(aiWrite);
    expect(taskWrite).toBeGreaterThan(documentWrite);
    expect(activationRunWrite).toBeGreaterThan(taskWrite);
    expect(organizationCompletion).toBeGreaterThan(activationRunWrite);
    expect(reconciliationSource.slice(organizationCompletion)).toContain("onboarding_status = 'completed'");
  });

  it('preserves tenants that completed onboarding before the organization profile columns existed', () => {
    expect(hardeningSource).toContain('with latest_completed as');
    expect(hardeningSource).toContain("where lower(coalesce(status, '')) = 'completed'");
    expect(hardeningSource).toContain("onboarding_status = 'completed'");
    expect(hardeningSource).toContain('onboarding_completed_at = coalesce');
    expect(hardeningSource).toContain('latest_completed.created_at');
    expect(hardeningSource).toContain('latest_completed.selected_plan');
  });

  it('binds the final actor and AI-system state to the requested tenant', () => {
    expect(reconciliationSource).toContain('systems.organization_id = p_organization_id');
    expect(reconciliationSource).toContain("'ai_system_not_found'::text");
    expect(hardeningSource).toContain('member.organization_id = p_organization_id');
    expect(hardeningSource).toContain('member.user_id = p_actor_user_id');
    expect(hardeningSource).toContain("v_actor_status is distinct from 'active'");
    expect(hardeningSource).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
  });

  it('makes retries deterministic without duplicating activation data', () => {
    expect(reconciliationSource).toContain('onboarding_activation_runs_org_idempotency_key_idx');
    expect(reconciliationSource).toContain('(organization_id, idempotency_key)');
    expect(reconciliationSource).toContain("documents.metadata ->> 'recommendationId'");
    expect(reconciliationSource).toContain("tasks.metadata ->> 'suggestionId'");
    expect(hardeningSource).toContain("v_activation.outcome = 'replayed'");
    expect(hardeningSource).toContain('invitation.revoked_at is null');
    expect(actionSource).toContain("createHash('sha256').update(JSON.stringify(canonicalPayload))");
  });

  it('routes onboarding invitations through the same seat-aware Enterprise authority', () => {
    expect(seatAuthoritySource).toContain('create or replace function public.create_organization_invitation_with_seat_atomic');
    expect(seatAuthoritySource).toContain("v_actor_status is distinct from 'active'");
    expect(seatAuthoritySource).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(seatAuthoritySource).toContain('v_active_members + v_pending_members >= v_member_limit');
    expect(seatAuthoritySource).toContain('v_active_seats + v_pending_seats >= v_seat_limit');
    expect(hardeningSource).toContain("jsonb_set(p_activation, '{inviteEmails}', '[]'::jsonb, true)");
    expect(hardeningSource).toContain('public.create_organization_invitation_with_seat_atomic');
    expect(hardeningSource).toContain("'viewer',\n      'viewer'");
    expect(hardeningSource).toContain("v_invitation.outcome <> 'created'");
    expect(hardeningSource).toContain("raise exception 'onboarding_invitation_seat_authority_denied:%'");
    expect(hardeningSource).not.toContain('insert into public.invitations');
  });

  it('keeps only the hardened wrapper externally executable', () => {
    expect(hardeningSource).toContain('rename to complete_onboarding_activation_atomic_reconciled');
    expect(hardeningSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)',
    );
    expect(hardeningSource).toContain('from public, anon, authenticated, service_role');
    expect(hardeningSource).toContain('security definer');
    expect(hardeningSource).toContain('set search_path = pg_catalog, public');
    expect(hardeningSource).toContain(
      'grant execute on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)',
    );
    expect(hardeningSource).toContain('to service_role');
  });

  it('adapts the reconciled write to the actual production schema instead of replaying stale assumptions', () => {
    expect(reconciliationSource).toContain('assigned_to');
    expect(reconciliationSource).not.toContain('user_id,\n        title');
    expect(reconciliationSource).toContain("v_invite_email_array text[] := '{}'::text[]");
    expect(reconciliationSource).toContain('recommended_documents');
    expect(reconciliationSource).toContain('suggested_tasks');
  });

  it('treats provider delivery as a truthful retryable post-commit side effect', () => {
    expect(actionSource).toContain('if (!delivery.sent)');
    expect(actionSource).toContain("area: 'onboarding_invitation_delivery'");
    expect(actionSource).toContain('Onboarding data was saved, but invitation delivery failed.');
    expect(actionSource).not.toContain('randomUUID()');
    expect(hardeningSource).toContain("replace(gen_random_uuid()::text, '-', '')");
  });
});
