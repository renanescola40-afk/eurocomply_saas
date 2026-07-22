import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const registryPath = 'docs/compliance/eu-ai-act-runtime-evidence-registry.json';
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
const shaOk = /^[0-9a-f]{40}$/.test(targetSha);

if (registry.repository !== 'renanescola40-afk/eurocomply_saas') throw new Error('Unexpected repository');
if (!Array.isArray(registry.evidence) || registry.evidence.length !== 15) throw new Error('Expected 15 runtime evidence entries');

let acceptedWeight = 4; // legal rules registry has static/runtime provenance already accepted by the product scorecard.
const results = [];
for (const item of registry.evidence) {
  if (!Number.isInteger(item.weight) || item.weight <= 0) throw new Error(`Invalid weight for ${item.id}`);
  if (path.isAbsolute(item.path) || item.path.includes('..')) throw new Error(`Unsafe path for ${item.id}`);
  const exists = existsSync(item.path);
  let accepted = false;
  let reason = exists ? 'invalid_or_stale_evidence' : 'missing_evidence';
  if (exists) {
    try {
      const evidence = JSON.parse(readFileSync(item.path, 'utf8'));
      const observedSha = evidence.targetSha || evidence.releaseSha || evidence.commitSha || evidence.sha;
      const status = String(evidence.status || evidence.result || evidence.decision || '').toUpperCase();
      accepted = shaOk && observedSha === targetSha && /PASS|SUCCESS|GO|VERIFIED/.test(status);
      reason = accepted ? 'accepted_exact_sha' : 'invalid_or_stale_evidence';
    } catch {
      reason = 'invalid_json';
    }
  }
  if (accepted) acceptedWeight += item.weight;
  results.push({ id: item.id, weight: item.weight, path: item.path, accepted, reason });
}

const report = {
  schema: 'risck-comply.eu-ai-act-runtime-evidence-report.v1',
  generatedAt: new Date().toISOString(),
  repository: registry.repository,
  targetSha,
  targetShaValid: shaOk,
  runtimeEvidenceCoverage: acceptedWeight,
  remainingRuntimeEvidence: 100 - acceptedWeight,
  decision: acceptedWeight === 100 ? 'EU_AI_ACT_RUNTIME_EVIDENCE_READY' : registry.decisionOnIncomplete,
  results,
};
report.integrity = { sha256: createHash('sha256').update(JSON.stringify(report)).digest('hex') };
writeFileSync('eu-ai-act-runtime-evidence-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!shaOk) process.exitCode = 1;
