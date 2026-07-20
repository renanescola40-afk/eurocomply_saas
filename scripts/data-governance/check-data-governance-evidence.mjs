#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/security/evidence/runtime/data-governance-validation.json';
const failures = [];
let evidence = null;
if (!existsSync(path)) failures.push('data governance evidence is missing');
try { if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8')); }
catch { failures.push('data governance evidence is invalid JSON'); }

const requiredChecks = [
  'protectedMainExecution','exactShaBound','explicitConfirmation','residencyRegionDeclared',
  'retentionWindowValid','exportEncryptionRequired','governanceTablesPresent','rlsEnabled',
  'tenantPoliciesPresent','dataMinimizationConstraintsPresent','dsrDeadlineEnforced',
  'auditIntegritySchemaPresent','exportWorkflowDocumented','deletionWorkflowDocumented',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.data-governance-evidence.v1') failures.push('data governance schema is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('data governance evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.targetSha ?? ''))) failures.push('data governance evidence is not exact-SHA bound');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`data governance check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length) failures.push('data governance evidence contains failures');
  for (const field of ['databaseUrlStored','rowDataStored','personalDataStored','subjectIdentifiersStored','exportPayloadStored']) {
    if (evidence.evidenceIntegrity?.[field] !== false) failures.push(`unsafe evidence integrity field ${field}`);
  }
  const serialized = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of ['postgresql://','password=','authorization','@gmail.com','@outlook.com','access_token','refresh_token']) {
    if (serialized.includes(forbidden)) failures.push(`evidence contains forbidden material: ${forbidden}`);
  }
}

if (failures.length) {
  console.error('Data governance evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Data governance evidence validation passed.');
