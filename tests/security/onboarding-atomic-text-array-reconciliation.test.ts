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
const canonicalInventorySource = fs.readFileSync(
  'supabase/migrations/20260610_ai_governance_inventory.sql',
  'utf8',
);
const innerFunctionStart = fixSource.indexOf(
  'create or replace function public.complete_onboarding_activation_atomic_reconciled(',
);
const innerFunctionEnd = fixSource.indexOf(
  'revoke all on function public.complete_onboarding_activation_atomic_reconciled(',
);
const innerFunctionSource = fixSource.slice(innerFunctionStart, innerFunctionEnd);

describe('onboarding atomic schema-adaptive production reconciliation', () => {
  it('preserves both the canonical JSONB replay contract and the live text[] contract without altering columns', () => {
    expect(canonicalInventorySource).toContain("obligations jsonb not null default '[]'::jsonb");
    expect(canonicalInventorySource).toContain("next_actions jsonb not null default '[]'::jsonb");
    expect(fixSource).toContain("a.attname = 'obligations'");
    expect(fixSource).toContain("a.attname = 'next_actions'");
    expect(fixSource).toContain("obligations_type not in ('jsonb', 'text[]')");
    expect(fixSource).toContain('obligations_type <> next_actions_type');
    expect(fixSource).not.toContain('alter table public.ai_systems');
  });

  it('binds converted values to the actual ai_systems column types at function compilation time', () => {
    expect(innerFunctionSource).toContain('v_obligations public.ai_systems.obligations%type;');
    expect(innerFunctionSource).toContain('v_next_actions public.ai_systems.next_actions%type;');
    expect(innerFunctionSource).toContain('from jsonb_populate_record(');
    expect(innerFunctionSource).toContain('null::public.ai_systems');
    expect(innerFunctionSource).toContain("'obligations', coalesce(v_ai_system -> 'obligations', '[]'::jsonb)");
    expect(innerFunctionSource).toContain("'next_actions', coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)");
  });

  it('accepts missing or empty obligations/actions as arrays without inventing values', () => {
    expect(innerFunctionSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) <> 'array'",
    );
    expect(innerFunctionSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) <> 'array'",
    );
    expect(innerFunctionSource).toContain("coalesce(v_ai_system -> 'obligations', '[]'::jsonb)");
    expect(innerFunctionSource).toContain("coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)");
  });

  it('fails closed for non-array obligations and nextActions', () => {
    expect(innerFunctionSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) <> 'array'",
    );
    expect(innerFunctionSource).toContain(
      "jsonb_typeof(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) <> 'array'",
    );
    expect(innerFunctionSource).toContain("'invalid_input'::text");
  });

  it('fails closed when either JSON array contains non-string elements', () => {
    expect(innerFunctionSource).toContain("where jsonb_typeof(obligation.value) <> 'string'");
    expect(innerFunctionSource).toContain("where jsonb_typeof(next_action.value) <> 'string'");
  });

  it('uses schema-coerced values on both existing-system UPDATE and new-system INSERT paths', () => {
    expect(innerFunctionSource).toContain('obligations = v_obligations');
    expect(innerFunctionSource).toContain('next_actions = v_next_actions');
    expect(innerFunctionSource).toContain('v_obligations,\n      v_next_actions,\n      p_actor_user_id');
    expect(innerFunctionSource).not.toContain(
      "obligations = coalesce(v_ai_system -> 'obligations', '[]'::jsonb)",
    );
    expect(innerFunctionSource).not.toContain(
      "next_actions = coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)",
    );
  });

  it('keeps the transaction, tenant binding and idempotent replay contract intact', () => {
    expect(innerFunctionSource).toContain('where organizations.id = p_organization_id\n  for update;');
    expect(innerFunctionSource).toContain('systems.organization_id = p_organization_id');
    expect(innerFunctionSource).toContain('runs.organization_id = p_organization_id');
    expect(innerFunctionSource).toContain('runs.idempotency_key = p_idempotency_key');
    expect(innerFunctionSource).toContain("'replayed'::text");
    expect(innerFunctionSource).toContain('insert into public.onboarding_activation_runs');
    expect(innerFunctionSource).toContain("onboarding_status = 'completed'");
  });

  it('preserves bounded readiness-score validation', () => {
    expect(innerFunctionSource).toContain(
      "coalesce(p_activation ->> 'readinessScore', '') !~ '^[0-9]{1,3}$'",
    );
    expect(innerFunctionSource).toContain('v_readiness_score < 0');
    expect(innerFunctionSource).toContain('v_readiness_score > 100');
  });

  it('does not bypass the licensed server action or active owner/admin wrapper', () => {
    expect(actionSource).toContain('await requireLicensedOnboardingAuthority(organizationId)');
    expect(actionSource).toContain('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC');
    expect(hardeningSource).toContain("v_actor_status is distinct from 'active'");
    expect(hardeningSource).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(hardeningSource).toContain('public.complete_onboarding_activation_atomic_reconciled');
  });

  it('keeps the inner RPC private and SECURITY DEFINER search paths fixed', () => {
    expect(innerFunctionSource).toContain('security definer');
    expect(innerFunctionSource).toContain('set search_path = pg_catalog, public');
    expect(fixSource).toContain(
      'revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)',
    );
    expect(fixSource).toContain('from public, anon, authenticated, service_role');
    expect(fixSource).toContain("not has_function_privilege('service_role', wrapper_oid, 'EXECUTE')");
    expect(fixSource).toContain("has_function_privilege('service_role', inner_oid, 'EXECUTE')");
    expect(fixSource).not.toContain('disable row level security');
  });
});
