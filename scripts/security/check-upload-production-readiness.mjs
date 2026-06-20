#!/usr/bin/env node
import fs from 'node:fs';

const evidencePath = 'docs/security/evidence/operational/upload-production-readiness.json';
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const failures = [];

if (evidence.evidenceItem !== 'upload-production-readiness') {
  failures.push('Evidence item must be upload-production-readiness.');
}

if (evidence.status !== 'PendingRuntimeValidation' && evidence.status !== 'Complete') {
  failures.push('Evidence status must be PendingRuntimeValidation or Complete.');
}

if (!/No secrets/i.test(evidence.redactionConfirmation ?? '')) {
  failures.push('Evidence must explicitly confirm that no secrets are stored.');
}

if (evidence.requiredEnvironment?.REQUIRE_MALWARE_SCAN_FOR_UPLOADS !== 'true') {
  failures.push('Production readiness must require REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true.');
}

const provider = evidence.requiredEnvironment?.MALWARE_SCANNER_PROVIDER ?? '';
for (const requiredProvider of ['clamav', 'clamd', 'http', 'generic-http', 'webhook']) {
  if (!provider.includes(requiredProvider)) {
    failures.push(`Production readiness must mention provider mode ${requiredProvider}.`);
  }
}

const migrations = evidence.requiredEnvironment?.SUPABASE_MIGRATIONS ?? [];
for (const requiredMigration of [
  '20260620090000_upload_malware_scan_hardening.sql',
  '20260620120000_controlled_document_storage_read_lockdown.sql',
]) {
  if (!migrations.includes(requiredMigration)) {
    failures.push(`Production readiness must require migration ${requiredMigration}.`);
  }
}

const scenarios = evidence.productionValidationScenarios ?? [];
const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
for (const requiredScenario of [
  'clean-upload-accepted',
  'scanner-unavailable-blocked',
  'unsafe-verdict-blocked',
  'mime-spoofing-blocked',
  'cross-tenant-download-blocked',
  'direct-storage-access-blocked',
  'audit-events-present',
]) {
  if (!scenarioIds.has(requiredScenario)) {
    failures.push(`Missing production validation scenario: ${requiredScenario}.`);
  }
}

if (!/Do not mark enterprise upload\/document readiness as 100%/i.test(evidence.goNoGoRule ?? '')) {
  failures.push('Evidence must include a go/no-go rule that blocks 100% readiness until live validation is complete.');
}

if (evidence.status === 'Complete') {
  const incomplete = scenarios.filter((scenario) => scenario.status !== 'Complete');
  if (incomplete.length > 0) {
    failures.push('Complete evidence requires every production validation scenario to be Complete.');
  }
}

if (failures.length > 0) {
  console.error('Upload production readiness evidence check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Upload production readiness evidence check passed.');
