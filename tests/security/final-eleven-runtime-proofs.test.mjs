import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const technical = await readFile('scripts/security/run-final-technical-controls-proof.mjs', 'utf8');
const technicalWorkflow = await readFile('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const ephemeralRecovery = await readFile('scripts/recovery/manage-ephemeral-recovery-database.mjs', 'utf8');
const fixtures = await readFile('scripts/security/lib/ephemeral-auth-fixtures.mjs', 'utf8');
const assuranceWorkflow = await readFile('.github/workflows/enterprise-final-assurance-proof.yml', 'utf8');

test('final technical proof exercises disposable auth, storage isolation, cleanup and rolled-back security events', () => {
  for (const token of [
    'createEphemeralAuthFixtures',
    'cleanupEphemeralAuthFixtures',
    'authFixturesCreated',
    'authFixturesRemoved',
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

  for (const token of [
    'auth.admin.createUser',
    'auth.admin.deleteUser',
    "from('organizations')",
    "from('organization_members')",
  ]) assert.match(fixtures, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(technicalWorkflow, /environment: production-final-technical-proof/);
  assert.match(technicalWorkflow, /EXECUTE_FINAL_TECHNICAL_PROOF/);
  assert.match(technicalWorkflow, /persist-credentials: false/);
  assert.match(technicalWorkflow, /Start exact-SHA disposable Supabase project database/);
  assert.match(technicalWorkflow, /Remove disposable recovery database/);
  assert.match(technicalWorkflow, /supabase\/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520/);
  assert.doesNotMatch(technicalWorkflow, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
  assert.match(ephemeralRecovery, /RECOVERY_ISOLATED_DATABASE_URL/);
  assert.match(ephemeralRecovery, /supabase.*db.*start/s);
  assert.match(ephemeralRecovery, /stop', '--no-backup'/);
  for (const removedSecret of [
    'AUTH_RBAC_ORGANIZATION_A_ID',
    'AUTH_RBAC_OWNER_EMAIL',
    'AUTH_RBAC_OWNER_PASSWORD',
    'AUTH_RBAC_OUTSIDER_EMAIL',
    'AUTH_RBAC_OUTSIDER_PASSWORD',
  ]) assert.doesNotMatch(technicalWorkflow, new RegExp(removedSecret));
});

test('final assurance proof has a protected independent approval boundary', () => {
  assert.match(assuranceWorkflow, /environment: production-enterprise-assurance/);
  assert.match(assuranceWorkflow, /VALIDATE_FINAL_ASSURANCE/);
  assert.match(assuranceWorkflow, /fetch-depth: 0/);
  assert.doesNotMatch(assuranceWorkflow, /pull_request_target/);
  assert.doesNotMatch(assuranceWorkflow, /contents:\s*write/);
});
