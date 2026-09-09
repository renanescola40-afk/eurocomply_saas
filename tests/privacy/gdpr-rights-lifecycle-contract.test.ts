import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260909143000_harden_data_subject_request_lifecycle.sql', 'utf8');
const atomicAuditMigration = readFileSync('supabase/migrations/20260909223000_atomic_data_subject_request_lifecycle_audit.sql', 'utf8');
const intake = readFileSync('src/app/api/gdpr/requests/route.ts', 'utf8');
const lifecycle = readFileSync('src/app/api/gdpr/requests/[id]/route.ts', 'utf8');
const deleteRoute = readFileSync('src/app/api/gdpr/delete-request/route.ts', 'utf8');
const service = readFileSync('src/server/privacy/data-subject-requests.ts', 'utf8');

describe('canonical GDPR rights-request lifecycle contract', () => {
  it('evolves the existing data_subject_requests table without creating a competitor', () => {
    expect(migration).toContain("to_regclass('public.data_subject_requests')");
    expect(migration).not.toContain('create table if not exists public.data_subject_requests');
    expect(migration).not.toContain("interval '30 days'");
    expect(migration).toContain('alter column due_at drop default');
    for (const column of [
      'received_at',
      'initial_due_at',
      'identity_verification_state',
      'role_route',
      'customer_controller_reference',
      'extension_reason',
      'extension_notified_at',
      'extended_due_at',
      'decision_reason',
      'evidence_refs',
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("'portability'");
    expect(migration).toContain("'consent_withdrawal'");
  });

  it('makes browser mutations fail closed while preserving tenant-scoped reads', () => {
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke insert, update, delete on table public.data_subject_requests from anon, authenticated');
    expect(migration).toContain('grant select on table public.data_subject_requests to authenticated');
    expect(migration).toContain('restrict_data_subject_requests_insert_server_only');
    expect(migration).toContain('restrict_data_subject_requests_update_server_only');
    expect(migration).toContain('restrict_data_subject_requests_delete_server_only');
  });

  it('requires a durable canonical record before claiming request intake success', () => {
    const createIndex = intake.indexOf('createDataSubjectRequestRecord({');
    const auditIndex = intake.indexOf("action: 'gdpr_rights_request_created'");
    const notifyIndex = intake.indexOf('createNotification({');
    expect(createIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(createIndex);
    expect(notifyIndex).toBeGreaterThan(auditIndex);
    expect(intake).toContain('deleteDataSubjectRequestRecordForCompensation({');
    expect(intake).toContain("policy: 'gdpr-delete'");
    expect(intake).not.toContain('assertGdprSelfServiceEnabled');
  });

  it('binds the legacy destructive delete intake to the same canonical request id', () => {
    const createIndex = deleteRoute.indexOf('createDataSubjectRequestRecord({');
    const auditIndex = deleteRoute.indexOf("action: 'gdpr_delete_requested'");
    const notifyIndex = deleteRoute.indexOf('createNotification({');
    expect(createIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(createIndex);
    expect(notifyIndex).toBeGreaterThan(auditIndex);
    expect(deleteRoute).toContain("requestType: 'deletion'");
    expect(deleteRoute).toContain('canonicalRequestId: canonicalRequest.request.id');
    expect(deleteRoute).toContain('deleteDataSubjectRequestRecordForCompensation({');
  });

  it('provides tenant-scoped admin processing with attributable lifecycle evidence', () => {
    expect(service).toContain(".eq('organization_id', input.organizationId)");
    expect(service).toContain(".eq('organization_id', organizationId)");
    expect(lifecycle).toContain("permission: 'manage_settings'");
    expect(lifecycle).toContain("category: 'gdpr'");
    expect(lifecycle).toContain("action: 'gdpr_rights_request_lifecycle_changed'");
    expect(lifecycle).toContain('notificationEvidenceRef');
    expect(lifecycle).toContain('customerControllerReference');
    expect(lifecycle).toContain('buildAuditRequestContextFromRequest(request)');
  });

  it('keeps terminal requests immutable and refreshes attributable modification time', () => {
    expect(lifecycle).toContain('TERMINAL_REQUEST_STATUSES');
    expect(lifecycle).toContain("'completed'");
    expect(lifecycle).toContain("'rejected'");
    expect(lifecycle).toContain("'cancelled'");
    expect(lifecycle).toContain('TERMINAL_REQUEST_STATUSES.has(current.status)');
    expect(lifecycle).toContain("error: 'gdpr_rights_request_terminal'");
    expect(lifecycle).toContain('status: 409');
    expect(lifecycle).toContain('patch.updated_at = now');
    expect(service).toContain("'updated_at'");
  });

  it('makes lifecycle transitions and their audit append one atomic database transaction', () => {
    expect(atomicAuditMigration).toContain('create or replace function public.update_data_subject_request_with_audit_atomic(');
    expect(atomicAuditMigration).toContain('security definer');
    expect(atomicAuditMigration).toContain('set search_path = pg_catalog');
    expect(atomicAuditMigration).toContain('update public.data_subject_requests as dsr');
    expect(atomicAuditMigration).toContain('dsr.status = p_expected_status');
    expect(atomicAuditMigration).toContain('dsr.updated_at = p_expected_updated_at');
    expect(atomicAuditMigration).toContain("raise exception 'data subject request state conflict'");
    expect(atomicAuditMigration).toContain('perform public.append_audit_event_chained(');
    expect(atomicAuditMigration).toContain('from public, anon, authenticated');
    expect(atomicAuditMigration).toContain('to service_role');

    const updateIndex = atomicAuditMigration.indexOf('update public.data_subject_requests as dsr');
    const auditIndex = atomicAuditMigration.indexOf('perform public.append_audit_event_chained(');
    expect(updateIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(updateIndex);

    expect(service).toContain('updateDataSubjectRequestWithAuditAtomic');
    expect(service).toContain("rpc('update_data_subject_request_with_audit_atomic'");
    expect(service).toContain('buildAuditChainRecord({');
    expect(service).toContain('sanitizeAuditMetadata({');
    expect(service).toContain("reason: 'request_state_conflict'");
    expect(service).toContain("reason: 'audit_chain_conflict'");
    expect(service).not.toContain('export async function updateDataSubjectRequestRecord(');

    expect(lifecycle).toContain('expectedStatus: current.status');
    expect(lifecycle).toContain('expectedUpdatedAt: current.updated_at');
    expect(lifecycle).toContain("updated.reason === 'request_state_conflict'");
    expect(lifecycle).toContain("error: 'gdpr_rights_request_state_conflict'");
    expect(lifecycle).not.toContain('createAuditEvent({');
    expect(lifecycle).not.toContain('compensationRestored');
    expect(lifecycle).not.toContain('previousValues(');
  });

  it('advances the optimistic concurrency timestamp monotonically', () => {
    expect(lifecycle).toContain('function nextLifecycleTimestamp(currentUpdatedAt: string)');
    expect(lifecycle).toContain('const observedUpdatedAtMs = Date.parse(currentUpdatedAt)');
    expect(lifecycle).toContain('Math.max(wallClockMs, observedUpdatedAtMs + 1)');
    expect(lifecycle).toContain('const now = nextLifecycleTimestamp(current.updated_at)');
    expect(atomicAuditMigration).toContain("if not (p_patch ? 'updated_at') then");
    expect(atomicAuditMigration).toContain('v_next_updated_at <= p_expected_updated_at');
  });
});
