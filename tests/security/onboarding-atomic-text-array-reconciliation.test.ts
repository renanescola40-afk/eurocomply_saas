import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const fixSource = fs.readFileSync(
  'supabase/migrations/20260903114500_reconcile_onboarding_atomic_text_arrays.sql',
  'utf8',
);
const actionSource = fs.readFileSync('src/server/actions/onboarding.ts', 'utf8');
const hardeningSource = fs.readFileSync(
  'supabase/migrations/20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql',
  'utf8',
);

describe('onboarding atomic text[] production reconciliation', () => {
  it('preserves the canonical ai_systems text[] schema instead of weakening it', () => {
    expect(fixSource).toContain("a.attname = 'obligations'");
    expect(fixSource).toContain("a.attname = 'next_actions'");
    expect(fixSource).toContain("obligations_type is distinct from 'text[]'");
    expect(fixSource).toContain("next_actions_type is distinct from 'text[]'");
    expect(fixSource).not.toContain('alter table public.ai_systems');
  });

  it('accepts missing or empty JSON arrays and converts them to empty PostgreSQL text arrays', () => {
    expect(fixSource).toContain("coalesce(v_ai_system -> 'obligations', '[]'::jsonb)");
    expect(fixSource).toContain("coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)");
    expect(fixSource).toContain("v_obligations text[] := '{}'::text[]");
    expect(fixSource).toContain("v_next_actions text[] := '{}'::text[]");
    expect(fixSource).toContain("coalesce(array_agg(element.value order by element.ordinality), '{}'::text[])");
  });

  it('converts multiple string obligations/actions while preserving order and duplicates', () => {
    expect(fixSource.match(/jsonb_array_elements_text/g)?.length).toBe(2);
    expect(fixSource.match(/with ordinality as element\(value, ordinality\)/g)?.length).toBe(2);
    expect(fixSource.match(/array_agg\(element\.value order by element\.ordinality\)/g)?.length).toBe(2);
  });

  it('fails closed for non-array obligations and nextActions', () => {
    expect(fixSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) <> 'array'",
    );
    expect(fixSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) <> 'array'",
    );
    expect(fixSource).toContain("'invalid_input'::text");
  });

  it('fails closed when either JSON array contains non-string elements', () => {
    expect(fixSource).toContain("where jsonb_typeof(obligation.value) <> 'string'");
    expect(fixSource).toContain("where jsonb_typeof(next_action.value) <> 'string'");
  });

  it('uses converted text[] values on both existing-system UPDATE and new-system INSERT paths', () => {
    expect(fixSource).toContain('obligations = v_obligations');
    expect(fixSource).toContain('next_actions = v_next_actions');
    expect(fixSource).toContain('v_obligations,\n      v_next_actions,\n      p_actor_user_id');
    expect(fixSource).not.toContain(
      "obligations = coalesce(v_ai_system -> 'obligations', '[]'::jsonb)",
    );
    expect(fixSource).not.toContain(
      "next_actions = coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)",
    );
  });

  it('keeps the transaction, tenant binding and idempotent replay contract intact', () => {
    expect(fixSource).toContain('where organizations.id = p_organization_id\n  for update;');
    expect(fixSource).toContain('systems.organization_id = p_organization_id');
    expect(fixSource).toContain('runs.organization_id = p_organization_id');
    expect(fixSource).toContain('runs.idempotency_key = p_idempotency_key');
    expect(fixSource).toContain("'replayed'::text");
    expect(fixSource).toContain('insert into public.onboarding_activation_runs');
    expect(fixSource).toContain("onboarding_status = 'completed'");
  });

  it('preserves bounded readiness-score validation', () => {
    expect(fixSource).toContain("coalesce(p_activation ->> 'readinessScore', '') !~ '^[0-9]{1,3}$'");
    expect(fixSource).toContain('v_readiness_score < 0');
    expect(fixSource).toContain('v_readiness_score > 100');
  });

  it('does not bypass the licensed server action or active owner/admin wrapper', () => {
    expect(actionSource).toContain('await requireLicensedOnboardingAuthority(organizationId)');
    expect(actionSource).toContain('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC');
    expect(hardeningSource).toContain("v_actor_status is distinct from 'active'");
    expect(hardeningSource).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(hardeningSource).toContain('public.complete_onboarding_activation_atomic_reconciled');
  });

  it('keeps the inner RPC private and SECURITY DEFINER search paths fixed', () => {
    expect(fixSource).toContain('security definer');
    expect(fixSource).toContain('set search_path = pg_catalog, public');
    expect(fixSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)',
    );
    expect(fixSource).toContain('from public, anon, authenticated, service_role');
    expect(fixSource).toContain("not has_function_privilege('service_role', wrapper_oid, 'EXECUTE')");
    expect(fixSource).toContain("has_function_privilege('service_role', inner_oid, 'EXECUTE')");
    expect(fixSource).not.toContain('disable row level security');
  });
});
