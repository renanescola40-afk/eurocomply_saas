import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildCanonicalEvidence,
  removeStaleFinalTechnicalEvidence,
  selectExactShaRun,
  selectFinalTechnicalEvidenceEntry,
  validateFinalTechnicalEvidence,
} from '../../scripts/enterprise/fetch-final-technical-controls-evidence.mjs';
import { evaluateEvidenceDocument } from '../../scripts/enterprise/generate-readiness-scorecard.mjs';

const targetSha = 'a'.repeat(40);
const runId = '123456';
const roots: string[] = [];
const scorecardWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
const stabilizerWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard-stabilizer.yml', 'utf8');
const controls = JSON.parse(readFileSync('docs/enterprise/controls.json', 'utf8'));

function sourceEvidence() {
  return {
    schema: 'risck-comply.final-technical-controls-evidence.v1',
    evidenceItem: 'final-technical-controls-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-08-05T17:00:00.000Z',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'main',
    targetSha,
    observedSha: targetSha,
    workflowRunId: runId,
    checks: {
      protectedMainExecution: true,
      exactShaBound: true,
      ownerUploadAllowed: true,
      ownerReadAllowed: true,
      outsiderReadDenied: true,
      outsiderUploadDenied: true,
      syntheticObjectsRemoved: true,
      sessionsRevoked: true,
      securityEventInserted: true,
      timelineEventInserted: true,
      transactionRolledBack: true,
    },
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      objectPathsStored: false,
      organizationIdentifiersStored: false,
      userIdentifiersStored: false,
      credentialsStored: false,
      objectBodiesStored: false,
      databaseUrlStored: false,
      securityEventContentStored: false,
      syntheticStorageRemoved: true,
      syntheticDatabaseRowsRolledBack: true,
      exactShaBound: true,
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('final technical controls evidence promotion', () => {
  it('is orchestrated by the stabilizer and fetched before scorecard generation', () => {
    expect(stabilizerWorkflow).toContain('- Final Technical Controls Proof');
    expect(scorecardWorkflow).not.toContain('- Final Technical Controls Proof');
    expect(scorecardWorkflow).not.toContain("github.event.workflow_run.name == 'Final Technical Controls Proof'");
    expect(scorecardWorkflow).not.toContain('github.event.workflow_run');
    const fetchIndex = scorecardWorkflow.indexOf('Retrieve exact-SHA final technical controls evidence');
    const generateIndex = scorecardWorkflow.indexOf('Generate scorecard');
    expect(fetchIndex).toBeGreaterThan(0);
    expect(generateIndex).toBeGreaterThan(fetchIndex);
    expect(scorecardWorkflow).toContain('docs/security/evidence/runtime/security-events-validation.json');
    expect(scorecardWorkflow).toContain('docs/security/evidence/runtime/storage-tenant-isolation-validation.json');
  });

  it('selects only the successful workflow-dispatch run on exact main SHA', () => {
    const accepted = {
      id: Number(runId),
      name: 'Final Technical Controls Proof',
      head_sha: targetSha,
      head_branch: 'main',
      event: 'workflow_dispatch',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-05T17:01:00.000Z',
    };
    const rejected = { ...accepted, id: 8, event: 'push' };

    expect(selectExactShaRun([rejected, accepted], targetSha, runId)?.id).toBe(Number(runId));
    expect(selectExactShaRun([rejected], targetSha)).toBeNull();
  });

  it('fails closed on incomplete, SHA-mismatched or sensitive source evidence', () => {
    const invalid = sourceEvidence();
    invalid.targetSha = 'b'.repeat(40);
    invalid.checks.outsiderReadDenied = false;
    invalid.evidenceIntegrity.credentialsStored = true;

    expect(validateFinalTechnicalEvidence(invalid, { targetSha, runId })).toEqual(expect.arrayContaining([
      'exact_sha_mismatch',
      'check_failed:outsiderReadDenied',
      'integrity_invalid:credentialsStored',
    ]));
    expect(() => buildCanonicalEvidence(invalid, { targetSha, runId })).toThrow('final_technical_evidence_invalid');
  });

  it('derives the exact scorecard documents without promoting beyond the live proof', () => {
    const evidence = buildCanonicalEvidence(sourceEvidence(), { targetSha, runId });

    expect(evaluateEvidenceDocument(evidence.securityEvents, 'securityEvents')).toBe('PASS');
    expect(evidence.storage.checks[0]?.name).toBe('storageTenantIsolation');
    expect(evaluateEvidenceDocument(evidence.storage, 'storageTenantIsolation')).toBe('PASS');
    expect(evidence.securityEvents.sourceWorkflow.exactShaBound).toBe(true);
    expect(evidence.storage.evidenceIntegrity.syntheticStorageRemoved).toBe(true);
    expect(JSON.stringify(evidence)).not.toContain('password');
  });

  it('does not promote audit-log tenant isolation from security-event persistence', () => {
    const tenancyAudit = controls.domains.find((domain: { id: string }) => domain.id === 'tenancy').controls[8];
    const operationsEvents = controls.domains.find((domain: { id: string }) => domain.id === 'operations').controls[2];

    expect(tenancyAudit.evidence.path).toBe('docs/security/evidence/runtime/audit-chain-validation.json');
    expect(operationsEvents.evidence.path).toBe('docs/security/evidence/runtime/security-events-validation.json');
  });

  it('accepts one bounded source entry and rejects traversal or ambiguity', () => {
    expect(selectFinalTechnicalEvidenceEntry(['final-technical-controls-validation.json']))
      .toBe('final-technical-controls-validation.json');
    expect(() => selectFinalTechnicalEvidenceEntry(['../final-technical-controls-validation.json']))
      .toThrow('artifact_zip_unsafe_entry');
    expect(() => selectFinalTechnicalEvidenceEntry([
      'final-technical-controls-validation.json',
      'nested/final-technical-controls-validation.json',
    ])).toThrow('final_technical_source_not_unique');
  });

  it('removes stale security-event and storage evidence before every lookup', () => {
    const root = mkdtempSync(join(tmpdir(), 'final-technical-fetch-'));
    roots.push(root);
    for (const relativePath of [
      'docs/security/evidence/runtime/security-events-validation.json',
      'docs/security/evidence/runtime/storage-tenant-isolation-validation.json',
    ]) {
      const path = join(root, relativePath);
      mkdirSync(join(path, '..'), { recursive: true });
      writeFileSync(path, '{}');
    }

    removeStaleFinalTechnicalEvidence(root);

    expect(() => readFileSync(join(root, 'docs/security/evidence/runtime/security-events-validation.json'))).toThrow();
    expect(() => readFileSync(join(root, 'docs/security/evidence/runtime/storage-tenant-isolation-validation.json'))).toThrow();
  });
});
