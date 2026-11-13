import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { checkMappedAuditCoverage } from '../../scripts/security/check-audit-critical-coverage.mjs';

const read = (path: string) => readFileSync(path, 'utf8');
const atomicSql = 'supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql';
const memberSql = 'supabase/migrations/20261018190000_reconcile_audited_membership_usage_counters.sql';
const writer = 'src/server/billing/commercial-resource-atomic.ts';
const edit = (path: string, change: (source: string) => string) =>
  checkMappedAuditCoverage((file: string) => file === path ? change(read(file)) : read(file));

describe('SEC-06 audit coverage source boundaries', () => {
  it('recognizes the reconciled criteria through their actual production emitters', () => {
    expect(checkMappedAuditCoverage(read)).toEqual([]);
  });

  it('rejects a role event present only in a comment or an unrelated audit stream', () => {
    expect(edit(memberSql, source => source.replace(
      "    'team_member_role_changed', 'organization_member',",
      "    'other_action', 'organization_member', -- 'team_member_role_changed'",
    ))).toContain('team.member_role_changed');
  });

  it('requires the matching executable risk caller, signer and both SQL streams', () => {
    expect(edit('src/server/actions/risks.ts', source => source.replace("operation: 'delete'", "operation: 'create'"))).toContain('risk.delete');
    expect(edit(writer, source => source.replace('${input.resource}.${input.operation}', '${input.resource}.${input.resource}'))).toContain('risk.delete');
    expect(edit(atomicSql, source => source.replace("p_resource_type || '.' || p_operation", "'other_action'"))).toContain('risk.delete');
  });

  it('requires the actual create and delete paths for both commercial resource types', () => {
    expect(edit('src/server/actions/vendors.ts', source => source.replace(
      "operation: 'delete'", "operation: 'create'",
    ))).toEqual(['vendor.delete']);
    expect(edit('src/server/actions/risks.ts', source => source.replace(
      "operation: 'create'", "operation: 'delete'",
    ))).toEqual(['risk.create']);
  });

  it('rejects a disconnected permission policy audit even when the SQL event table exists', () => {
    expect(edit('src/server/enterprise/group-access-admin.ts', source => source.replace(
      ".rpc('apply_enterprise_group_access_policy_change_atomic'", ".rpc('unrelated_rpc'",
    ))).toContain('permission.changed');
  });

  it('ignores a route audit token when the executable audit call is removed', () => {
    expect(edit('src/app/api/gdpr/export/route.ts', source => source.replace(
      'const auditResult = await createAuditEvent({',
      'const auditResult = await unrelatedFunction({',
    ))).toContain('gdpr.export');
  });

  it('requires both document approval outcomes and does not accept a commented call', () => {
    expect(edit('src/app/api/documents/[id]/approval/route.ts', source => source.replace(
      "'document_rejected'", "'document_approved' /* 'document_rejected' */",
    ))).toContain('document.approval_changed');
  });

  it('requires step-up metadata to reach the persistent audit writer', () => {
    expect(edit('src/server/security/step-up.ts', source => source.replace(
      'stepUpEvent: input.event', 'stepUpEvent: input.action',
    ))).toContain('auth.step_up_approved');
  });

  it('requires the Stripe update emitter to forward the action to the audit writer', () => {
    expect(edit('src/server/billing/stripe-webhooks.ts', source => source.replace(
      'action: input.action', "action: 'other_action'",
    ))).toContain('billing.subscription_updated');
    expect(edit('src/server/billing/stripe-webhooks.ts', source => source.replace(
      "? 'deleted' : 'updated'", "? 'deleted' : 'created'",
    ))).toContain('billing.subscription_updated');
  });
});
