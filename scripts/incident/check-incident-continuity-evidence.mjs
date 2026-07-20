#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/security/evidence/runtime/incident-continuity-validation.json';
const failures = [];
if (!existsSync(path)) failures.push('incident evidence is missing');
let evidence = null;
try { if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8')); }
catch { failures.push('incident evidence is invalid JSON'); }

const requiredChecks = [
  'protectedMainExecution','exactShaBound','explicitConfirmation','incidentTablesPresent','forcedRlsEnabled',
  'completeCrudPoliciesPresent','severityModelPresent','evidenceIntegrityConstraintsPresent',
  'sev1AcknowledgementTargetConfigured','sev1ContainmentTargetConfigured','tabletopFreshnessConfigured',
  'oncallRotationConfigured','notificationMatrixReviewed',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.incident-continuity-evidence.v1') failures.push('incident schema is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('incident evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.targetSha ?? ''))) failures.push('incident evidence is not exact-SHA bound');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`incident check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length) failures.push('incident evidence contains failures');
  for (const field of ['databaseUrlStored','incidentDataStored','timelineContentStored','personalDataStored','tokensStored']) {
    if (evidence.evidenceIntegrity?.[field] !== false) failures.push(`incident evidence integrity ${field} is unsafe`);
  }
  const serialized = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of ['postgresql://','access_token','authorization: bearer','incident title','customer email']) {
    if (serialized.includes(forbidden)) failures.push(`incident evidence contains forbidden material: ${forbidden}`);
  }
}

if (failures.length) {
  console.error('Incident continuity evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Incident continuity evidence validation passed.');
