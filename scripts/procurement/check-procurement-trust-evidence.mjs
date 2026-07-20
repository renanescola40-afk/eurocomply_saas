#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/security/evidence/runtime/procurement-trust-validation.json';
const failures = [];
if (!existsSync(path)) failures.push('procurement trust evidence is missing');
let evidence = null;
try { if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8')); }
catch { failures.push('procurement trust evidence is invalid JSON'); }

const requiredChecks = [
  'protectedMainExecution','exactShaBound','explicitConfirmation','procurementTablesPresent','rlsEnabled',
  'completeCrudPoliciesPresent','trustPackageIntegrityEnforced','procurementSlaConfigured',
  'encryptedEvidencePackagesRequired','subprocessorRegisterReviewed','publicTrustCenterConfigured',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.procurement-trust-evidence.v1') failures.push('procurement trust schema is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('procurement trust evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.targetSha ?? ''))) failures.push('procurement trust evidence is not exact-SHA bound');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`procurement trust check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length) failures.push('procurement trust evidence contains failures');
  for (const field of ['databaseUrlStored','customerDataStored','vendorNamesStored','questionnaireAnswersStored','evidencePayloadStored','tokensStored']) {
    if (evidence.evidenceIntegrity?.[field] !== false) failures.push(`unsafe procurement trust integrity field ${field}`);
  }
  const serialized = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of ['postgresql://','authorization:','access_token','refresh_token','questionnaire_answer']) {
    if (serialized.includes(forbidden)) failures.push(`procurement trust evidence contains forbidden material: ${forbidden}`);
  }
}

if (failures.length) {
  console.error('Procurement trust evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Procurement trust evidence validation passed.');
