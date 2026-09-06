import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906006800_harden_cross_tenant_reference_integrity.sql',
  'utf8',
);

const guardedRelations = [
  'ai_assessments.ai_system_id',
  'ai_incidents.ai_system_id',
  'ai_system_history.ai_system_id',
  'compliance_findings.assessment_id',
  'compliance_tasks.finding_id',
  'enterprise_access_export_download_events.export_job_id',
  'enterprise_access_operation_events.operation_id',
  'enterprise_access_operation_items.identity_id',
  'enterprise_access_operation_items.membership_id',
  'enterprise_access_operation_items.operation_id',
  'enterprise_contract_billing_events.contract_id',
  'enterprise_seat_contention_events.membership_id',
  'enterprise_seat_events.reservation_id',
  'enterprise_seat_operations.membership_id',
  'evidence_item_audit_events.evidence_item_id',
  'evidence_items.finding_id',
  'evidence_items.task_id',
  'organization_entitlements.contract_id',
];

describe('cross-tenant reference integrity', () => {
  it('covers every reviewed single-id multi-tenant reference', () => {
    for (const relation of guardedRelations) {
      expect(migration).toContain(`cross_tenant_reference: ${relation}`);
      expect(migration).toContain(`existing cross-tenant reference: ${relation}`);
    }
  });

  it('runs as a locked SECURITY DEFINER trigger while remaining non-executable by browser roles', () => {
    expect(migration).toContain(
      'create or replace function app_private.enforce_same_tenant_reference_integrity()',
    );
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      'revoke all on function app_private.enforce_same_tenant_reference_integrity() from public, anon, authenticated;',
    );
    expect(migration).toContain(
      'grant execute on function app_private.enforce_same_tenant_reference_integrity() to service_role;',
    );
  });

  it('installs one explicit trigger on every guarded child table', () => {
    const childTables = [
      'ai_assessments',
      'ai_incidents',
      'ai_system_history',
      'compliance_findings',
      'compliance_tasks',
      'enterprise_access_export_download_events',
      'enterprise_access_operation_events',
      'enterprise_access_operation_items',
      'enterprise_contract_billing_events',
      'enterprise_seat_contention_events',
      'enterprise_seat_events',
      'enterprise_seat_operations',
      'evidence_item_audit_events',
      'evidence_items',
      'organization_entitlements',
    ];

    for (const table of childTables) {
      expect(migration).toContain(` on public.${table}`);
    }

    expect(migration).toContain(
      'same-tenant reference integrity trigger is missing or duplicated',
    );
  });

  it('does not repair migration history or use destructive/unbounded release primitives', () => {
    const normalized = migration.toLowerCase();
    expect(normalized).not.toContain('supabase_migrations.schema_migrations');
    expect(normalized).not.toContain('db push --include-all');
    expect(normalized).not.toContain('disable row level security');
    expect(normalized).not.toContain('grant all on public.');
    expect(normalized).not.toContain('grant all on storage.');
    expect(normalized).not.toContain('drop table ');
    expect(normalized).not.toContain('truncate ');
  });
});
