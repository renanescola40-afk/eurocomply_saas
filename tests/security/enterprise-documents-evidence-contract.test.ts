import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260720230000_enterprise_documents_evidence_reporting.sql', 'utf8');
const validator = readFileSync('scripts/documents/check-enterprise-documents-evidence.mjs', 'utf8');

describe('enterprise documents evidence contract', () => {
  it('forces RLS on every document table', () => {
    for (const table of ['enterprise_documents','enterprise_document_versions','enterprise_document_reviews','enterprise_report_exports']) {
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('keeps versions and reviews append-only for authenticated users', () => {
    expect(migration).toContain('enterprise_versions_update_deny');
    expect(migration).toContain('enterprise_versions_delete_deny');
    expect(migration).toContain('enterprise_reviews_update_deny');
    expect(migration).toContain('enterprise_reviews_delete_deny');
  });

  it('requires SHA-256 integrity and redacted exact-SHA evidence', () => {
    expect(migration).toContain("content_digest_sha256 ~ '^[0-9a-f]{64}$'");
    expect(validator).toContain("^[0-9a-f]{40}$");
    expect(validator).toContain('forbidden_field');
  });
});