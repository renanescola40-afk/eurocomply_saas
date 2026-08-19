#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validateExternalSecurityReviewEvidence } from '../release/validate-external-security-review-evidence.mjs';

const canonicalEvidencePath = 'docs/security/evidence/runtime/external-security-review-or-pentest.json';
const inputPath = process.env.EXTERNAL_ASSURANCE_INPUT || canonicalEvidencePath;
const outputPath = process.env.EXTERNAL_ASSURANCE_OUTPUT || 'artifacts/external-security-assurance-decision.json';
const promotedEvidencePath = process.env.EXTERNAL_ASSURANCE_CANONICAL_OUTPUT || null;
const expectedSha = String(process.env.RELEASE_SHA || '').trim().toLowerCase();
const evidenceCommitSha = String(process.env.EXTERNAL_ASSURANCE_EVIDENCE_COMMIT_SHA || '').trim().toLowerCase() || null;
const maximumAgeDays = Number(process.env.EXTERNAL_ASSURANCE_MAX_AGE_DAYS || 180);

if (!/^[a-f0-9]{40}$/.test(expectedSha)) {
  throw new Error('RELEASE_SHA must be a full lowercase 40-character SHA');
}
if (evidenceCommitSha && !/^[a-f0-9]{40}$/.test(evidenceCommitSha)) {
  throw new Error('EXTERNAL_ASSURANCE_EVIDENCE_COMMIT_SHA must be a full lowercase 40-character SHA');
}
if (!Number.isFinite(maximumAgeDays) || maximumAgeDays < 1 || maximumAgeDays > 365) {
  throw new Error('Invalid assurance age limit');
}

const raw = await readFile(inputPath, 'utf8');
const evidence = JSON.parse(raw);
const blockers = validateExternalSecurityReviewEvidence(evidence, {
  expectedCommitSha: expectedSha,
  now: new Date(),
  maxAgeDays: maximumAgeDays,
});
const uniqueBlockers = [...new Set(blockers)].sort();
const decision = uniqueBlockers.length === 0 ? 'ACCEPTED_FOR_ENTERPRISE_PROMOTION' : 'NO_GO';

const result = {
  schema: 'risck-comply.external-security-assurance-acceptance.v2',
  releaseSha: expectedSha,
  releaseBranch: 'main',
  evidenceCommitSha,
  canonicalEvidencePath,
  decision,
  blockers: uniqueBlockers,
  assessorProviderLegalEntity: evidence?.assessor?.providerLegalEntity ?? null,
  testingDeliveryEntity: evidence?.assessor?.testingDeliveryEntity ?? null,
  reportDate: evidence?.report?.reportDate ?? null,
  reportDigest: evidence?.report?.reportDigest ?? null,
  findingsSummary: evidence?.findingsSummary ?? null,
  evidenceSha256: `sha256:${createHash('sha256').update(raw).digest('hex')}`,
  validatedAt: new Date().toISOString(),
  evidenceIntegrity: {
    containsSensitiveValues: false,
    rawReportStored: false,
    canonicalMetadataOnly: true,
    exactShaBound: true,
  },
  truthBoundary: decision === 'ACCEPTED_FOR_ENTERPRISE_PROMOTION'
    ? 'This decision accepts only the canonical redacted external-assurance metadata for the exact release SHA. The private pentest report remains outside the repository and is referenced by immutable private evidence metadata.'
    : 'External assurance remains No-Go. This decision does not create, infer, or upgrade independent evidence.',
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

if (decision === 'ACCEPTED_FOR_ENTERPRISE_PROMOTION' && promotedEvidencePath) {
  await mkdir(path.dirname(promotedEvidencePath), { recursive: true });
  await writeFile(promotedEvidencePath, raw);
}

console.log(JSON.stringify({
  decision,
  blockerCount: uniqueBlockers.length,
  releaseSha: expectedSha,
  evidenceCommitSha,
}));

if (decision !== 'ACCEPTED_FOR_ENTERPRISE_PROMOTION') process.exitCode = 1;
