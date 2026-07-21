import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const technical = await readFile('scripts/security/run-final-technical-controls-proof.mjs', 'utf8');
const technicalWorkflow = await readFile('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const assuranceWorkflow = await readFile('.github/workflows/enterprise-final-assurance-proof.yml', 'utf8');

test('final technical proof exercises storage isolation, cleanup and rolled-back security events', () => {
  for (const token of [
    'ownerUploadAllowed',
    'ownerReadAllowed',
    'outsiderReadDenied',
    'outsiderUploadDenied',
    'syntheticObjectsRemoved',
    'sessionsRevoked',
    'securityEventInserted',
    'timelineEventInserted',
    'transactionRolledBack',
    'begin;',
    'rollback;',
  ]) assert.match(technical, new RegExp(token));
  assert.match(technicalWorkflow, /environment: production-final-technical-proof/);
  assert.match(technicalWorkflow, /EXECUTE_FINAL_TECHNICAL_PROOF/);
  assert.match(technicalWorkflow, /persist-credentials: false/);
  assert.match(technicalWorkflow, /RECOVERY_ISOLATED_DATABASE_URL/);
});

test('final assurance proof has a protected independent approval boundary', () => {
  assert.match(assuranceWorkflow, /environment: production-enterprise-assurance/);
  assert.match(assuranceWorkflow, /VALIDATE_FINAL_ASSURANCE/);
  assert.match(assuranceWorkflow, /fetch-depth: 0/);
  assert.doesNotMatch(assuranceWorkflow, /pull_request_target/);
  assert.doesNotMatch(assuranceWorkflow, /contents:\s*write/);
});
