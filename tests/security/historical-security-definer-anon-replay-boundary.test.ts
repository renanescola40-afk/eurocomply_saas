import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const finalIsolation = readFileSync(
  'supabase/migrations/20260906006700_billing_governance_workflow_plan_isolation.sql',
  'utf8',
);

const historicalReplayDefiners = [
  'guard_frozen_legal_review_package',
  'guard_issued_legal_review_decision',
  'guard_legal_review_package_item_mutation',
  'ai_annex_iv_actor_is_member',
  'ai_conformity_actor_is_member',
  'ai_prohibited_actor_is_member',
  'ai_provider_data_actor_is_member',
  'enforce_ai_annex_iv_change_actor_scope',
  'enforce_ai_annex_iv_decision_actor_scope',
  'enforce_ai_annex_iv_evidence_actor_scope',
  'enforce_ai_annex_iv_package_actor_scope',
  'enforce_ai_annex_iv_section_actor_scope',
  'enforce_ai_conformity_assessment_actor_scope',
  'enforce_ai_conformity_decision_actor_scope',
  'enforce_ai_conformity_evidence_actor_scope',
  'enforce_ai_eu_declaration_actor_scope',
  'enforce_ai_eu_registration_actor_scope',
  'enforce_ai_prohibited_decision_actor_scope',
  'enforce_ai_prohibited_evidence_actor_scope',
  'enforce_ai_prohibited_exception_actor_scope',
  'enforce_ai_prohibited_review_actor_scope',
  'enforce_ai_prohibited_signal_actor_scope',
  'enforce_ai_provider_data_decision_actor_scope',
  'enforce_ai_provider_data_program_actor_scope',
  'enforce_ai_provider_dataset_actor_scope',
  'enforce_ai_provider_dataset_assessment_actor_scope',
  'enforce_ai_provider_dataset_evidence_actor_scope',
  'enforce_ai_provider_dataset_mitigation_actor_scope',
  'enforce_ai_qms_control_actor_scope',
  'enforce_ai_qms_decision_actor_scope',
  'enforce_ai_qms_nonconformity_actor_scope',
  'enforce_ai_qms_operational_actor_scope',
  'enforce_ai_qms_system_actor_scope',
  'guard_qms_child_mutation',
  'is_enterprise_integration_admin',
  'refresh_qms_system_counters',
  'sync_qms_counters_after_nonconformity',
] as const;

describe('historical SECURITY DEFINER anonymous replay boundary', () => {
  it('reconciles every exact replay offender before the global fail-closed guard', () => {
    expect(historicalReplayDefiners).toHaveLength(37);
    expect(finalIsolation).toContain('do $historical_replay_security_definer_acl_hardening$');

    for (const functionName of historicalReplayDefiners) {
      expect(finalIsolation).toContain(`'${functionName}'`);
    }

    const hardeningStart = finalIsolation.indexOf('do $historical_replay_security_definer_acl_hardening$');
    const globalGuardStart = finalIsolation.indexOf('do $global_client_security_postconditions$');

    expect(hardeningStart).toBeGreaterThan(-1);
    expect(globalGuardStart).toBeGreaterThan(hardeningStart);

    const hardening = finalIsolation.slice(hardeningStart, globalGuardStart);
    expect(hardening).toContain(
      "'revoke execute on function %I.%I(%s) from public, anon'",
    );
    expect(hardening).toContain('pg_get_function_identity_arguments(p.oid)');
    expect(hardening).not.toContain('grant execute');
  });

  it('keeps the global anonymous SECURITY DEFINER invariant fail closed', () => {
    expect(finalIsolation).toContain("and has_function_privilege('anon', p.oid, 'EXECUTE')");
    expect(finalIsolation).toContain(
      "message = 'anonymous role can execute an application SECURITY DEFINER function'",
    );
  });
});
