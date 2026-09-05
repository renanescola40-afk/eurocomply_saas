import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_RECOVERY_WINDOW_MS,
  PROTECTED_ORGANIZATION_IDS,
  SYNTHETIC_AUDIT_ACTION,
  SYNTHETIC_PURPOSE,
  isSyntheticAuthUser,
  isSyntheticOrganizationRow,
  validateRecoveryWindow,
} from '../../scripts/security/recover-audit-chain-synthetic-residue.mjs';
import {
  assertAuditEventsBoundToSyntheticOrganizations,
} from '../../scripts/security/preflight-audit-chain-synthetic-recovery-scope.mjs';

const producer = readFileSync('scripts/security/recover-audit-chain-synthetic-residue.mjs', 'utf8');
const preflight = readFileSync('scripts/security/preflight-audit-chain-synthetic-recovery-scope.mjs', 'utf8');
const sqlRecovery = readFileSync('scripts/security/recover-audit-chain-synthetic-residue.sql', 'utf8');
const evidenceHelper = readFileSync('scripts/security/audit-chain-synthetic-recovery-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/audit-chain-synthetic-recovery.yml', 'utf8');

describe('audit-chain synthetic recovery', () => {
  it('accepts only a bounded explicit recovery window', () => {
    const window = validateRecoveryWindow('2026-09-05T22:34:00Z', '2026-09-05T22:55:00Z');
    expect(window.from).toBe('2026-09-05T22:34:00.000Z');
    expect(window.to).toBe('2026-09-05T22:55:00.000Z');
    expect(MAX_RECOVERY_WINDOW_MS).toBe(7_200_000);
    expect(() => validateRecoveryWindow('2026-09-05T22:00:00Z', '2026-09-06T01:00:01Z')).toThrow('recovery_window_too_wide');
    expect(() => validateRecoveryWindow('invalid', '2026-09-05T22:55:00Z')).toThrow('recovery_window_invalid');
  });

  it('requires the proof-only organization marker and denies historical protected fixtures', () => {
    expect(SYNTHETIC_PURPOSE).toBe('audit-chain-live-proof');
    expect(isSyntheticOrganizationRow({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'audit-chain-live-proof-a-123' })).toBe(true);
    expect(isSyntheticOrganizationRow({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'customer-production' })).toBe(false);
    for (const id of PROTECTED_ORGANIZATION_IDS) {
      expect(isSyntheticOrganizationRow({ id, slug: 'audit-chain-live-proof-a-123' })).toBe(false);
    }
  });

  it('requires the proof-only auth email marker inside the recovery window', () => {
    const from = '2026-09-05T22:34:00.000Z';
    const to = '2026-09-05T22:55:00.000Z';
    expect(isSyntheticAuthUser({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'audit-chain-live-proof-owner-123@example.com',
      created_at: '2026-09-05T22:40:00Z',
    }, from, to)).toBe(true);
    expect(isSyntheticAuthUser({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'real-customer@example.com',
      created_at: '2026-09-05T22:40:00Z',
    }, from, to)).toBe(false);
  });

  it('requires every candidate audit event to belong to a discovered synthetic organization', () => {
    const organizations = [
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'audit-chain-live-proof-a-123' },
    ];
    expect(assertAuditEventsBoundToSyntheticOrganizations(organizations, [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        organization_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        action: SYNTHETIC_AUDIT_ACTION,
      },
    ])).toEqual({ organizationsMatched: 1, auditEventsMatched: 1 });

    expect(() => assertAuditEventsBoundToSyntheticOrganizations(organizations, [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        organization_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        action: SYNTHETIC_AUDIT_ACTION,
      },
    ])).toThrow('audit_event_scope_not_bound_to_synthetic_organization');
  });

  it('locks the destructive scope to synthetic markers, caps, source lineage and explicit confirmation', () => {
    expect(SYNTHETIC_AUDIT_ACTION).toBe('security.audit_chain_live_validation');
    expect(producer).toContain("confirmation !== 'CLEANUP_AUDIT_CHAIN_SYNTHETIC'");
    expect(producer).toContain('MAX_SYNTHETIC_ORGANIZATIONS = 20');
    expect(producer).toContain('MAX_SYNTHETIC_USERS = 30');
    expect(producer).toContain('MAX_SYNTHETIC_AUDIT_EVENTS = 1_000');
    expect(producer).toContain('historicalFixtureCleanupAttempted: false');
    expect(producer).not.toContain('Promise.all([');
    expect(preflight).toContain(".select('id,organization_id,action,created_at')");
    expect(preflight).toContain('audit_event_scope_not_bound_to_synthetic_organization');

    expect(sqlRecovery).toContain('BEGIN;');
    expect(sqlRecovery).toContain('COMMIT;');
    expect(sqlRecovery).toContain("SET LOCAL statement_timeout = '30s'");
    expect(sqlRecovery).toContain("SET LOCAL lock_timeout = '5s'");
    expect(sqlRecovery).toContain("confirmation <> 'CLEANUP_AUDIT_CHAIN_SYNTHETIC'");
    expect(sqlRecovery).toContain('organization_count > 20');
    expect(sqlRecovery).toContain('audit_event_count > 1000');
    expect(sqlRecovery).toContain('auth_user_count > 30');
    expect(sqlRecovery).toContain('audit_event_scope_not_bound_to_synthetic_organization');
    expect(sqlRecovery).toContain('auth_user_scope_requires_admin_api');
    expect(sqlRecovery).toContain('0d5926df-1027-42da-8b14-579cc2630947');
    expect(sqlRecovery).toContain('bf6115c2-4258-4fde-9d43-854cb98bb075');
    expect(sqlRecovery).toContain('DELETE FROM public.audit_events');
    expect(sqlRecovery).toContain('DELETE FROM public.organization_entitlements');
    expect(sqlRecovery).toContain('DELETE FROM public.organization_usage');
    expect(sqlRecovery).toContain('DELETE FROM public.enterprise_contracts');
    expect(sqlRecovery).toContain('DELETE FROM public.organization_members');
    expect(sqlRecovery).toContain('DELETE FROM public.organizations');
    expect(sqlRecovery).toContain("'protectedOrganizationIdsTouched', false");
    expect(sqlRecovery).toContain("'rawIdentifiersStored', false");

    expect(evidenceHelper).toContain("case 'validate-preflight'");
    expect(evidenceHelper).toContain("case 'validate-complete'");
    expect(evidenceHelper).toContain("case 'write-failure'");
    expect(evidenceHelper).toContain("evidence?.cleanup?.protectedOrganizationIdsTouched !== false");
    expect(evidenceHelper).toContain("evidence?.evidenceIntegrity?.rawIdentifiersStored !== false");
    expect(evidenceHelper).toContain("Number(scope.authUsersMatched) !== 0");

    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}');
    expect(workflow).toContain('SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}');
    expect(workflow).not.toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(workflow).toContain("test \"$RECOVERY_CONFIRMATION\" = 'CLEANUP_AUDIT_CHAIN_SYNTHETIC'");
    expect(workflow).toContain('test "$main_sha" = "${TARGET_SHA,,}"');
    expect(workflow).toContain('/actions/runs/${RECOVERY_SOURCE_RUN_ID}');
    expect(workflow).toContain("test \"$(jq -r '.path' <<<\"$source_run\")\" = '.github/workflows/audit-chain-runtime-proof.yml'");
    expect(workflow).toContain("test \"$(jq -r '.conclusion' <<<\"$source_run\")\" = 'failure'");
    expect(workflow).toContain('compare/${source_sha}...${TARGET_SHA,,}');
    expect(workflow).toContain('Preflight transactional synthetic scope through Session Pooler');
    expect(workflow).toContain('Execute bounded transactional synthetic-only recovery');
    expect(workflow).toContain('audit-chain-synthetic-recovery-evidence.mjs validate-preflight');
    expect(workflow).toContain('audit-chain-synthetic-recovery-evidence.mjs validate-complete');
    expect(workflow).toContain('audit-chain-synthetic-recovery-evidence.mjs write-failure');
    expect(workflow).not.toContain("<<'NODE'");
    expect(workflow).toContain('-v execute_cleanup=false');
    expect(workflow).toContain('-v execute_cleanup=true');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('push:');
  });
});
