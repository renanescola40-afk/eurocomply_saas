import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  requiredHorizontalIsolationOperations,
  validateHorizontalIsolationEvidence,
} from '../../scripts/security/supabase-horizontal-rls-evidence.mjs';

function passingEvidence() {
  const testCases = Object.entries(requiredHorizontalIsolationOperations).flatMap(([table, operations]) =>
    operations.map((operation) => ({ table, operation, passed: true, returnedRows: 0, error: null })),
  );

  return {
    horizontalIsolation: {
      status: 'passed',
      sameTenantDistinctUsers: true,
      testedTables: Object.keys(requiredHorizontalIsolationOperations),
    },
    testCases,
  };
}

describe('same-tenant horizontal RLS evidence', () => {
  it('requires recipient, self/admin, and writer/member boundaries', () => {
    expect(requiredHorizontalIsolationOperations).toEqual({
      monitoring_preferences: [
        'horizontal_other_user_read_denied',
        'horizontal_other_user_update_denied',
        'horizontal_other_user_delete_denied',
        'horizontal_self_insert_allowed',
        'horizontal_self_read_allowed',
      ],
      notifications: [
        'horizontal_recipient_read_allowed',
        'horizontal_other_user_read_denied',
        'horizontal_other_user_update_denied',
        'horizontal_other_user_delete_denied',
        'horizontal_authenticated_insert_denied',
      ],
      onboarding_activation_runs: [
        'horizontal_member_read_allowed',
        'horizontal_member_insert_denied',
        'horizontal_member_update_denied',
        'horizontal_member_delete_denied',
      ],
    });
    expect(validateHorizontalIsolationEvidence(passingEvidence())).toEqual({ valid: true, errors: [] });
  });

  it('fails if one same-tenant cross-user denial is missing', () => {
    const evidence = passingEvidence();
    evidence.testCases = evidence.testCases.filter(
      (test) => !(test.table === 'notifications' && test.operation === 'horizontal_other_user_update_denied'),
    );
    const validation = validateHorizontalIsolationEvidence(evidence);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      'missing horizontal RLS operation coverage: notifications:horizontal_other_user_update_denied',
    );
  });

  it('fails if a required operation executed but did not pass', () => {
    const evidence = passingEvidence();
    const target = evidence.testCases.find(
      (test) => test.table === 'monitoring_preferences' && test.operation === 'horizontal_other_user_read_denied',
    );
    expect(target).toBeDefined();
    if (target) target.passed = false;
    const validation = validateHorizontalIsolationEvidence(evidence);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      'horizontal RLS operation failed: monitoring_preferences:horizontal_other_user_read_denied',
    );
  });

  it('fails unless distinct authenticated users inside the same tenant were exercised', () => {
    const evidence = passingEvidence();
    evidence.horizontalIsolation.sameTenantDistinctUsers = false;
    const validation = validateHorizontalIsolationEvidence(evidence);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('horizontal isolation must prove distinct users inside the same tenant');
  });

  it('locks the production monitoring SELECT policy to self/admin', () => {
    const migration = fs.readFileSync(
      'supabase/migrations/20260812230911_tighten_monitoring_preferences_horizontal_read_isolation.sql',
      'utf8',
    );
    expect(migration).toContain('drop policy if exists rls_monitoring_preferences_select_member_or_owner');
    expect(migration).toContain('create policy rls_monitoring_preferences_select_self_or_admin');
    expect(migration).toContain('current_app_user_matches(user_id)');
    expect(migration).toContain("app_private.has_org_role(organization_id, array['owner','admin']::text[])");
    expect(migration).toContain("raise exception 'legacy member-wide monitoring preferences SELECT policy survived'");
  });

  it('requires the promotion-bound workflow and final checker to enforce the integrated horizontal proof', () => {
    const workflow = fs.readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');
    const checker = fs.readFileSync('scripts/security/check-supabase-rls-runtime-evidence.mjs', 'utf8');
    const runner = fs.readFileSync('scripts/security/run-supabase-live-tenant-isolation-v4.mjs', 'utf8');

    expect(workflow).toContain('run: node scripts/security/run-supabase-live-tenant-isolation.mjs');
    expect(workflow).toContain('validate-supabase-live-promotion-source.mjs');
    expect(checker).toContain('validateHorizontalIsolationEvidence(evidence)');
    expect(checker).toContain('horizontal:${error}');
    expect(runner).toContain('horizontal_other_user_read_denied');
    expect(runner).toContain('horizontal_authenticated_insert_denied');
    expect(runner).toContain('horizontal_member_update_denied');
    expect(runner).toContain('sameTenantDistinctUsers: true');
    expect(workflow).not.toContain('append-supabase-live-horizontal-isolation.mjs');
  });
});
