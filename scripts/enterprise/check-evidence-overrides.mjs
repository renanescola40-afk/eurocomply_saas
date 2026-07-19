#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEFAULT_CONTROLS = 'docs/enterprise/controls.json';
const DEFAULT_OVERRIDES = 'docs/enterprise/evidence-overrides.json';

export const APPROVED_EVIDENCE_OVERRIDES = Object.freeze({
  'TRU-01': Object.freeze({ path: 'artifacts/trust-claims/trust-claims-validation.json', check: 'publicClaims' }),
  'TRU-02': Object.freeze({ path: 'artifacts/trust-claims/trust-claims-validation.json', check: 'publicClaims' }),
  'TRU-03': Object.freeze({ path: 'artifacts/trust-claims/trust-claims-validation.json', check: 'publicClaims' }),
  'SEC-05': Object.freeze({ path: 'docs/security/evidence/runtime/security-headers-validation.json', check: 'securityHeaders' }),
  'SEC-06': Object.freeze({ path: 'docs/security/evidence/runtime/no-store-validation.json', check: 'noStore' }),
  'REL-02': Object.freeze({ path: 'docs/security/evidence/runtime/production-runtime-validation.json', check: 'deploymentShaMatch' }),
  'REL-03': Object.freeze({ path: 'docs/security/evidence/runtime/production-runtime-validation.json', check: 'productionHostname' }),
  'REL-04': Object.freeze({ path: 'docs/security/evidence/runtime/production-runtime-validation.json', check: 'health' }),
  'REL-05': Object.freeze({ path: 'docs/security/evidence/runtime/production-runtime-validation.json', check: 'readiness' }),
  'REL-06': Object.freeze({ path: 'docs/security/evidence/runtime/production-runtime-validation.json', check: 'deploymentSmoke' }),
});

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function controlIds(config) {
  const ids = new Set();
  for (const domain of config?.domains ?? []) {
    for (const [index] of (domain.controls ?? []).entries()) {
      ids.add(`${domain.prefix}-${String(index + 1).padStart(2, '0')}`);
    }
  }
  return ids;
}

export function validateEvidenceOverrides(config, document) {
  const failures = [];
  const approvedEntries = Object.entries(APPROVED_EVIDENCE_OVERRIDES);

  if (!exactKeys(document, ['schemaVersion', 'overrides'])) failures.push('evidence overrides top-level fields must be exactly schemaVersion and overrides');
  if (document?.schemaVersion !== 1) failures.push('evidence overrides schemaVersion must be 1');
  if (!Array.isArray(document?.overrides)) {
    failures.push('evidence overrides must be an array');
    return failures;
  }
  if (document.overrides.length !== approvedEntries.length) failures.push(`evidence overrides must contain exactly ${approvedEntries.length} approved entries`);

  const availableControls = controlIds(config);
  const seen = new Set();
  for (const entry of document.overrides) {
    if (!exactKeys(entry, ['controlId', 'evidence'])) {
      failures.push('each evidence override must contain exactly controlId and evidence');
      continue;
    }
    const controlId = typeof entry.controlId === 'string' ? entry.controlId.trim() : '';
    if (!controlId) {
      failures.push('evidence override controlId is required');
      continue;
    }
    if (seen.has(controlId)) failures.push(`duplicate evidence override: ${controlId}`);
    seen.add(controlId);
    if (!availableControls.has(controlId)) failures.push(`evidence override references unknown control: ${controlId}`);

    const approved = APPROVED_EVIDENCE_OVERRIDES[controlId];
    if (!approved) {
      failures.push(`evidence override is not approved: ${controlId}`);
      continue;
    }
    if (!exactKeys(entry.evidence, ['path', 'check'])) {
      failures.push(`${controlId} evidence fields must be exactly path and check`);
      continue;
    }
    if (entry.evidence.path !== approved.path) failures.push(`${controlId} evidence.path is not approved`);
    if (entry.evidence.check !== approved.check) failures.push(`${controlId} evidence.check is not approved`);
  }

  for (const [controlId] of approvedEntries) {
    if (!seen.has(controlId)) failures.push(`approved evidence override is missing: ${controlId}`);
  }
  return failures;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const controlsPath = process.env.ENTERPRISE_CONTROLS_PATH || DEFAULT_CONTROLS;
  const overridesPath = process.env.ENTERPRISE_EVIDENCE_OVERRIDES_PATH || DEFAULT_OVERRIDES;
  const failures = validateEvidenceOverrides(readJson(controlsPath), readJson(overridesPath));
  if (failures.length > 0) {
    console.error('Enterprise evidence override guard failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Enterprise evidence override guard passed (${Object.keys(APPROVED_EVIDENCE_OVERRIDES).length} approved controls).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
