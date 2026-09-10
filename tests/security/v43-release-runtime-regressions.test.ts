import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const replayCompat = read('supabase/migrations/20260910113500_article5_policy_replay_compatibility_v43.sql');
const dsrForward = read('supabase/migrations/20260910115000_atomic_data_subject_request_lifecycle_audit_v43.sql');
const downloadActions = read('src/server/actions/document-downloads.ts');

describe('V43 terminal runtime regressions', () => {
  it('replaces historical Article 5 read policies without a clean-replay 42710 collision', () => {
    for (const policy of [
      'ai_prohibited_reviews_member_select',
      'ai_prohibited_signals_member_select',
      'ai_prohibited_exceptions_member_select',
      'ai_prohibited_evidence_member_select',
      'ai_prohibited_decisions_member_select',
    ]) {
      expect(replayCompat).toContain(`drop policy if exists ${policy}`);
    }
    expect(replayCompat).not.toMatch(/drop\s+table|truncate\s+table/i);
  });

  it('keeps onboarding recommendations metadata-only when their Storage object does not exist', () => {
    expect(dsrForward).toContain('enforce_onboarding_document_storage_integrity');
    expect(dsrForward).toContain("metadata ->> 'source', '') = 'onboarding_activation'");
    expect(dsrForward).toContain("object_record.bucket_id = 'controlled-documents'");
    expect(dsrForward).toContain("'orphanedStoragePath'");
    expect(dsrForward).toContain('new.storage_path := null');
    expect(dsrForward).toMatch(/update public\.documents[\s\S]*storage_path = null/i);
    expect(dsrForward).not.toMatch(/delete\s+from\s+public\.documents/i);
  });

  it('serializes rejected document audit events against the single audit-chain head', () => {
    const start = downloadActions.indexOf('async function auditRejectedDownloadUrl');
    const end = downloadActions.indexOf('async function enforceDocumentUrlRateLimit');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const body = downloadActions.slice(start, end);
    expect(body).not.toContain('Promise.all');
    expect(body.match(/await logAuditEvent\(/g)).toHaveLength(2);
    expect(body).toContain('UPLOAD_SECURITY_AUDIT_EVENTS.downloadDenied');
    expect(body).toContain("action: 'document.download_url_rejected'");
  });
});
