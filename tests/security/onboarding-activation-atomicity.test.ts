import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionSource = fs.readFileSync('src/server/actions/onboarding.ts', 'utf8');
const migrationSource = fs.readFileSync(
  'supabase/migrations/20260716183000_atomic_onboarding_activation.sql',
  'utf8',
);
const completionSource = actionSource.slice(
  actionSource.indexOf('export async function completeOnboardingActivation'),
);

describe('atomic onboarding activation contract', () => {
  it('uses one backend RPC instead of direct multi-table writes', () => {
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

  it('serializes the tenant and commits the completed status last', () => {
    const tenantLock = migrationSource.indexOf('for update;');
    const aiWrite = migrationSource.indexOf('insert into public.ai_systems');
    const documentWrite = migrationSource.indexOf('insert into public.documents');
    const taskWrite = migrationSource.indexOf('insert into public.compliance_tasks');
    const invitationWrite = migrationSource.indexOf('insert into public.invitations');
    const activationRunWrite = migrationSource.indexOf('insert into public.onboarding_activation_runs');
    const organizationCompletion = migrationSource.lastIndexOf('update public.organizations');

    expect(tenantLock).toBeGreaterThan(-1);
    expect(aiWrite).toBeGreaterThan(tenantLock);
    expect(documentWrite).toBeGreaterThan(aiWrite);
    expect(taskWrite).toBeGreaterThan(documentWrite);
    expect(invitationWrite).toBeGreaterThan(taskWrite);
    expect(activationRunWrite).toBeGreaterThan(invitationWrite);
    expect(organizationCompletion).toBeGreaterThan(activationRunWrite);
    expect(migrationSource.slice(organizationCompletion)).toContain("onboarding_status = 'completed'");
  });

  it('binds actor and AI-system state to the requested tenant', () => {
    expect(migrationSource).toContain('members.organization_id = p_organization_id');
    expect(migrationSource).toContain('members.user_id = p_actor_user_id');
    expect(migrationSource).toContain("v_actor_role not in ('owner', 'admin')");
    expect(migrationSource).toContain('systems.organization_id = p_organization_id');
    expect(migrationSource).toContain("'ai_system_not_found'::text");
  });

  it('makes retries deterministic without duplicating activation data', () => {
    expect(migrationSource).toContain('onboarding_activation_runs_org_idempotency_key_idx');
    expect(migrationSource).toContain('(organization_id, idempotency_key)');
    expect(migrationSource).toContain("'replayed'::text");
    expect(migrationSource).toContain("documents.metadata ->> 'recommendationId'");
    expect(migrationSource).toContain("tasks.metadata ->> 'suggestionId'");
    expect(actionSource).toContain("createHash('sha256').update(JSON.stringify(canonicalPayload))");
  });

  it('keeps the transaction backend-only with a fixed search path', () => {
    expect(migrationSource).toContain('security definer');
    expect(migrationSource).toContain('set search_path = pg_catalog, public');
    expect(migrationSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from public',
    );
    expect(migrationSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from anon',
    );
    expect(migrationSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from authenticated',
    );
    expect(migrationSource).toContain(
      'grant execute on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) to service_role',
    );
  });

  it('treats provider delivery as a truthful retryable post-commit side effect', () => {
    expect(actionSource).toContain('if (!delivery.sent)');
    expect(actionSource).toContain("area: 'onboarding_invitation_delivery'");
    expect(actionSource).toContain('Onboarding data was saved, but invitation delivery failed.');
    expect(actionSource).not.toContain('randomUUID()');
    expect(migrationSource).toContain("replace(gen_random_uuid()::text, '-', '')");
  });
});
