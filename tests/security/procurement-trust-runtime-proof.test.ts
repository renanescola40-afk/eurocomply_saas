import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/procurement-trust-runtime-proof.yml', 'utf8');
const migration = readFileSync('supabase/migrations/20260720210000_procurement_trust_operations.sql', 'utf8');
const runtime = readFileSync('scripts/procurement/run-procurement-trust-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/procurement/check-procurement-trust-evidence.mjs', 'utf8');

describe('procurement trust operations megapack', () => {
  it('uses protected exact-main manual execution', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-procurement-trust-proof');
    expect(workflow).toContain('EXECUTE_PROCUREMENT_TRUST_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('creates tenant-scoped procurement and trust controls', () => {
    for (const token of [
      'vendor_due_diligence','enterprise_procurement_requests','trust_evidence_packages',
      'security_questionnaire','subprocessor_list','dpa_status','digest_sha256','enable row level security',
      'vendor diligence admins delete','procurement requester or admins delete','trust packages admins update',
    ]) expect(migration).toContain(token);
  });

  it('validates without persisting sensitive procurement content', () => {
    for (const token of [
      'completeCrudPoliciesPresent','trustPackageIntegrityEnforced','procurementSlaConfigured',
      'encryptedEvidencePackagesRequired','subprocessorRegisterReviewed','customerDataStored: false',
    ]) expect(runtime).toContain(token);
    expect(runtime).not.toContain('select * from');
  });

  it('fails closed on unsafe or incomplete evidence', () => {
    for (const token of ['Complete','exact-SHA','postgresql://','questionnaireAnswersStored','evidencePayloadStored']) {
      expect(validator).toContain(token);
    }
  });
});
