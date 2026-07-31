#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COMPLETE = new Set(['Complete', 'COMPLETE', 'complete']);
const PASSED = new Set(['passed', 'PASS', 'pass', 'PASSED']);
const REQUIRED = [
  ['deploymentSmoke', 'deployment-smoke-validation.json'],
  ['rollbackDryRun', 'rollback-dry-run-validation.json'],
  ['productionFinal', 'production-final-validation.json'],
  ['supabaseLiveRls', 'supabase-live-rls-validation.json'],
  ['authenticatedSmoke', 'authenticated-production-smoke.json'],
  ['observability', 'observability-production-validation.json'],
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isSha = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
const passed = (doc) => COMPLETE.has(doc?.status) && PASSED.has(doc?.outcome);

function evidenceSha(doc) {
  return doc?.releaseSha ?? doc?.commitSha ?? doc?.sha ?? doc?.provenance?.commitSha ?? doc?.provenance?.sha;
}

function hasProvenance(doc) {
  const p = doc?.provenance;
  return Boolean(p && (p.workflowRunId || p.runId) && (p.workflowUrl || p.runUrl) && evidenceSha(doc));
}

export async function validateRuntimeCloseout({ evidenceDir, expectedSha }) {
  if (!isSha(expectedSha)) throw new Error('expected SHA must be a full 40-character commit SHA');
  const failures = [];
  const evidence = {};

  for (const [key, filename] of REQUIRED) {
    const filePath = path.join(evidenceDir, filename);
    try {
      const bytes = await readFile(filePath);
      const document = JSON.parse(bytes.toString('utf8'));
      const observedSha = evidenceSha(document);
      if (!passed(document)) failures.push(`${key}:not_complete_and_passed`);
      if (observedSha !== expectedSha) failures.push(`${key}:release_sha_mismatch`);
      if (!hasProvenance(document)) failures.push(`${key}:provenance_missing`);
      evidence[key] = { filename, sha256: sha256(bytes), observedSha, status: document.status, outcome: document.outcome };
    } catch (error) {
      failures.push(`${key}:missing_or_invalid:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const uniqueDigests = new Set(Object.values(evidence).map((item) => item.sha256));
  if (uniqueDigests.size !== Object.keys(evidence).length) failures.push('duplicate_evidence_payload_detected');

  const accepted = failures.length === 0;
  return {
    schema: 'risck-comply.enterprise-runtime-closeout.v1',
    generatedAt: new Date().toISOString(),
    releaseSha: expectedSha,
    status: accepted ? 'ENTERPRISE_RUNTIME_EVIDENCE_ACCEPTED' : 'ENTERPRISE_RUNTIME_EVIDENCE_BLOCKED',
    accepted,
    failures,
    evidence,
    safety: {
      repositoryChecksAreRuntimeProof: false,
      missingEvidenceMayPass: false,
      productionWritePerformed: false,
      enterpriseGoGrantedByThisArtifact: false,
    },
  };
}

async function main() {
  const [evidenceDir = 'docs/security/evidence/runtime', outputDir = 'artifacts/enterprise-runtime-closeout'] = process.argv.slice(2);
  const expectedSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  const result = await validateRuntimeCloseout({ evidenceDir, expectedSha });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'enterprise-runtime-closeout.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(path.join(outputDir, 'summary.md'), `# Enterprise runtime closeout\n\n- Status: \`${result.status}\`\n- Release SHA: \`${result.releaseSha}\`\n- Failures: ${result.failures.length}\n\nThis artifact validates runtime evidence only and does not independently grant Enterprise GO.\n`);
  console.log(JSON.stringify(result, null, 2));
  if (!result.accepted) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
