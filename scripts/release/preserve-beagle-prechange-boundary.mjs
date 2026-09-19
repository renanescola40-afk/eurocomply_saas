#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const releaseSha = String(process.env.RELEASE_SHA || process.env.RELEASE_COMMIT_SHA || '').trim().toLowerCase();
const fullSha = /^[a-f0-9]{40}$/;
if (!fullSha.test(releaseSha)) {
  throw new Error('RELEASE_SHA must be a full 40-character Git SHA');
}

const sources = [
  'docs/security/pentest/BEAGLE_ACTIVE_TEST_VERSION_BINDING_2026-09-12.md',
  'docs/operations/BEAGLE_ACTIVE_TEST_OPERATIONAL_NOTICE_2026-09-12.md',
  'docs/security/evidence/external/beagle-vapt-2026-09-12.md',
  'docs/security/pentest/production-testing-amendment.md',
];

for (const path of sources) {
  if (!existsSync(path)) throw new Error(`Required Beagle preservation source missing: ${path}`);
}

const binding = readFileSync(sources[0], 'utf8');
const externalEvidence = readFileSync(sources[2], 'utf8');

const testedSha =
  binding.match(/OBSERVED_PRODUCTION_GITHUB_SHA=([a-f0-9]{40})/)?.[1]
  || externalEvidence.match(/Production Git SHA:\s*`([a-f0-9]{40})`/)?.[1];

const testedDeploymentId =
  binding.match(/OBSERVED_PRODUCTION_DEPLOYMENT_ID=(dpl_[A-Za-z0-9]+)/)?.[1]
  || externalEvidence.match(/Production deployment:\s*`(dpl_[A-Za-z0-9]+)`/)?.[1];

if (!testedSha || !testedDeploymentId) {
  throw new Error('Beagle pre-change release binding is incomplete');
}

const targetBound =
  binding.includes('OBSERVED_PRODUCTION_DOMAIN=www.risckcomply.com')
  || externalEvidence.includes('https://www.risckcomply.com');

if (!targetBound) throw new Error('Beagle evidence is not bound to the canonical Production target');

const providerState = {
  testCompleted: /BEAGLE_TEST_COMPLETED=true/.test(externalEvidence),
  reportAvailable: /BEAGLE_REPORT_AVAILABLE=true/.test(externalEvidence),
  evidencePreserved: /EVIDENCE_PRESERVED=true/.test(externalEvidence),
  criticalOpen: Number(externalEvidence.match(/CRITICAL_OPEN=(\d+)/)?.[1] ?? NaN),
  highOpen: Number(externalEvidence.match(/HIGH_OPEN=(\d+)/)?.[1] ?? NaN),
  automatedExternalVapt:
    externalEvidence.match(/AUTOMATED_EXTERNAL_VAPT=([A-Z_]+)/)?.[1] ?? 'UNKNOWN',
};

const sourceDigests = Object.fromEntries(
  sources.map((path) => {
    const bytes = readFileSync(path);
    return [path, createHash('sha256').update(bytes).digest('hex')];
  }),
);

const output = 'artifacts/release/beagle-prechange-preservation.json';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({
  schema: 'risck-comply.beagle-prechange-preservation.v1',
  capturedAt: new Date().toISOString(),
  canonicalTarget: 'https://www.risckcomply.com',
  testedDeploymentId,
  testedSha,
  proposedReleaseSha: releaseSha,
  proposedReleaseIsPostPentestVersion: releaseSha !== testedSha,
  coverageInheritance: false,
  statement: 'Existing Beagle evidence remains attributed only to the tested pre-change Production version; this release does not inherit Beagle coverage without separate revalidation.',
  providerState,
  sourceDigests,
}, null, 2) + '\n');

process.stdout.write(`Preserved Beagle release boundary for tested SHA ${testedSha}; proposed release ${releaseSha} is treated as post-pentest and receives no inherited Beagle credit.\n`);
