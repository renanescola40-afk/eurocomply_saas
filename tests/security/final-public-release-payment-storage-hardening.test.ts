import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

const migrationPath = 'supabase/migrations/20260906000000_reconcile_final_public_release_payment_storage_hardening.sql';
const migration = read(migrationPath);
const storage = read('src/lib/evidence/storage.ts');
const config = JSON.parse(read('config/supabase-forward-reconciliation.json')) as {
  changeSet: string;
  migrations: Array<{ filename: string }>;
  truthBoundary: Record<string, boolean>;
};

const expectedForwardPackage = [
  '20260906000000_reconcile_final_public_release_payment_storage_hardening.sql',
  '20260906003000_billing_ai_system_commercial_quota.sql',
  '20260906003500_billing_self_serve_member_capacity.sql',
  '20260906004000_billing_document_storage_quota.sql',
  '20260906004500_billing_entitlement_catalog_truth.sql',
];

const auxiliaryTables = [
  'ai_fria_assessments',
  'ai_fria_decisions',
  'ai_fria_evidence',
  'ai_literacy_programs',
  'ai_literacy_courses',
  'ai_literacy_assignments',
  'ai_literacy_evidence',
  'ai_system_history',
  'vendor_review_history',
  'evidence_item_audit_events',
  'email_notification_events',
];

const allowedMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

describe('final public-release payment and Storage hardening V32', () => {
  it('preserves the two already-live 2026-09-04 reconciliation migrations byte-for-byte', () => {
    expect(sha256('supabase/migrations/20260904065919_reconcile_ai_governance_runtime_schema_20260904.sql'))
      .toBe('bceedb8d738c8bda3cb07e9f8849e85a670ea4439ffd669747fb630d980e042d');
    expect(sha256('supabase/migrations/20260904065952_reconcile_ai_system_atomic_rpcs_20260904.sql'))
      .toBe('642f48be06c110bdaf2f6c8c47fee6bbedd3984e780a846c2da2722f6e486cdc');
  });

  it('selects the exact V32 plus billing P0 package above the verified live ledger and never replays stale V31', () => {
    expect(config.changeSet).toBe('2026-09-06-final-public-release-payment-storage-hardening-v32');
    expect(config.migrations.map(({ filename }) => filename)).toEqual(expectedForwardPackage);
    expect(config.migrations.some(({ filename }) => filename === '20260904113000_final_public_release_payment_storage_hardening.sql')).toBe(false);
    expect(migration).toContain('20260905075429');
    expect(config.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(config.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(config.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });

  it('adds one restrictive commercial authority boundary and FORCE RLS to every identified auxiliary tenant table', () => {
    for (const table of auxiliaryTables) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain('as restrictive for all to authenticated');
    expect(migration).toContain('using (app_private.has_commercial_authority(organization_id))');
    expect(migration).toContain('with check (app_private.has_commercial_authority(organization_id))');
    expect(migration).toContain('alter table public.%I force row level security');
    expect(migration).toContain('c.relrowsecurity');
    expect(migration).toContain('c.relforcerowsecurity');
  });

  it('closes the legacy compliance-documents Storage payment bypass and binds upload to document-capable roles', () => {
    const readPolicy = migration.slice(
      migration.indexOf('create policy "Members can read organization document objects"'),
      migration.indexOf('drop policy if exists "Members can upload organization document objects"'),
    );
    const uploadPolicy = migration.slice(
      migration.indexOf('create policy "Members can upload organization document objects"'),
      migration.indexOf('-- Bound Evidence Vault resource use'),
    );

    expect(readPolicy).toContain("bucket_id = 'compliance-documents'");
    expect(readPolicy).toContain('app_private.evidence_storage_organization_id(name)');
    expect(readPolicy).toContain('app_private.is_org_member');
    expect(readPolicy).toContain('app_private.has_commercial_authority');

    expect(uploadPolicy).toContain("bucket_id = 'compliance-documents'");
    expect(uploadPolicy).toContain('app_private.evidence_storage_organization_id(name)');
    expect(uploadPolicy).toContain('app_private.has_org_role');
    expect(uploadPolicy).toContain("array['owner','admin','editor','member']::text[]");
    expect(uploadPolicy).toContain('app_private.has_commercial_authority');
    expect(uploadPolicy).not.toContain("'viewer'");

    expect(migration).toContain('parser/member/payment-first bound');
    expect(migration).toContain('parser/payment-first/RBAC-bound');
    expect(migration).toContain('unexpected direct UPDATE/DELETE policy survived for compliance-documents');
  });

  it('bounds Evidence Vault uploads at Storage, database metadata, and application boundaries', () => {
    expect(migration).toContain('file_size_limit = 10485760');
    expect(migration).toContain('evidence_items_file_size_bytes_check');
    expect(migration).toContain('file_size_bytes >= 0 and file_size_bytes <= 10485760');
    expect(migration).toContain('evidence_items_file_mime_type_check');
    expect(migration).toContain('c.convalidated');
    expect(migration).toContain('compliance-evidence bucket unexpectedly public');

    for (const mime of allowedMimeTypes) {
      expect(migration).toContain(`'${mime}'`);
      expect(storage).toContain(`'${mime}'`);
    }

    expect(storage).toContain('export const EVIDENCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;');
    expect(storage).toContain('EVIDENCE_ALLOWED_MIME_TYPE_SET.has(mimeType)');
    expect(storage).toContain('Evidence file exceeds the supported 10 MB limit.');
    expect(storage).toContain('Evidence file type is not supported.');

    const upload = storage.slice(storage.indexOf('export async function uploadEvidenceFile'));
    expect(upload.indexOf('validateEvidenceUpload(params.file)')).toBeGreaterThanOrEqual(0);
    expect(upload.indexOf('validateEvidenceUpload(params.file)')).toBeLessThan(upload.indexOf('sha256Hex(params.file)'));
    expect(upload.indexOf('validateEvidenceUpload(params.file)')).toBeLessThan(upload.indexOf(".from('evidence_items')"));
    expect(upload).toContain('upsert: false');
  });

  it('keeps active/web-executable and archive MIME types out of the reviewed Evidence Vault allowlist', () => {
    for (const forbidden of [
      'text/html',
      'image/svg+xml',
      'application/javascript',
      'text/javascript',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-msdownload',
    ]) {
      expect(migration).not.toContain(`'${forbidden}'`);
      expect(storage).not.toContain(`'${forbidden}'`);
    }
  });
});
