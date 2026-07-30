#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const configPath = join(root, 'config/enterprise-100-closure.json');
const outputPath = join(root, 'release-validation/enterprise-100-closure.json');

function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : 'invalid_json',
    };
  }
}

function normalise(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function findStatus(document) {
  const candidates = [
    document?.status,
    document?.outcome,
    document?.decision,
    document?.result,
    document?.publicationStatus,
    document?.releaseDecision,
    document?.summary?.status,
    document?.summary?.decision,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return normalise(candidate);
  }

  if (document?.success === true || document?.passed === true || document?.ok === true) {
    return 'SUCCESS';
  }

  return null;
}

function findSha(document) {
  const candidates = [
    document?.sha,
    document?.commitSha,
    document?.commit_sha,
    document?.releaseSha,
    document?.release_sha,
    document?.buildSha,
    document?.build_sha,
    document?.sourceSha,
    document?.source_sha,
    document?.productSha,
    document?.product_sha,
    document?.reviewBinding?.productSha,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() ?? null;
}

function digest(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

export function evaluateEnterpriseClosure({
  expectedSha = process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA?.trim() || process.env.GITHUB_SHA?.trim() || null,
  config = readJson(configPath).value,
} = {}) {
  if (!config || !Array.isArray(config.controls)) {
    return {
      schema: 'risck-comply.enterprise-100-closure-result.v1',
      expectedSha,
      decision: 'NO_GO',
      passed: false,
      blockers: ['closure_contract_invalid'],
      controls: [],
    };
  }

  const controls = config.controls.map((control) => {
    const absolutePath = join(root, control.evidence);
    if (!existsSync(absolutePath)) {
      return {
        id: control.id,
        owner: control.owner,
        evidence: control.evidence,
        status: 'MISSING',
        sha: null,
        shaMatches: false,
        accepted: false,
        reason: 'evidence_missing',
      };
    }

    const parsed = readJson(absolutePath);
    if (!parsed.value) {
      return {
        id: control.id,
        owner: control.owner,
        evidence: control.evidence,
        status: 'INVALID',
        sha: null,
        shaMatches: false,
        accepted: false,
        reason: parsed.error ?? 'invalid_json',
      };
    }

    const status = findStatus(parsed.value);
    const evidenceSha = findSha(parsed.value);
    const acceptedStatuses = (control.acceptedStatuses ?? []).map(normalise);
    const statusAccepted = status !== null && acceptedStatuses.includes(status);
    const shaMatches = Boolean(expectedSha && evidenceSha && evidenceSha === expectedSha);

    return {
      id: control.id,
      owner: control.owner,
      evidence: control.evidence,
      digest: digest(absolutePath),
      status,
      sha: evidenceSha,
      shaMatches,
      accepted: statusAccepted && shaMatches,
      reason: !statusAccepted
        ? 'status_not_accepted'
        : !shaMatches
          ? 'exact_sha_not_proven'
          : null,
    };
  });

  const blockers = controls.filter((control) => !control.accepted).map((control) => `${control.id}:${control.reason}`);
  const passed = Boolean(expectedSha) && blockers.length === 0;

  if (!expectedSha) blockers.unshift('exact_sha_unavailable');

  return {
    schema: 'risck-comply.enterprise-100-closure-result.v1',
    generatedAt: new Date().toISOString(),
    expectedSha,
    requiredDecision: config.requiredDecision,
    decision: passed ? 'GO' : 'NO_GO',
    passed,
    acceptedControls: controls.filter((control) => control.accepted).length,
    totalControls: controls.length,
    blockers,
    controls,
  };
}

const result = evaluateEnterpriseClosure();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

console.log(JSON.stringify({
  decision: result.decision,
  expectedSha: result.expectedSha,
  acceptedControls: result.acceptedControls,
  totalControls: result.totalControls,
  blockers: result.blockers,
}, null, 2));

if (!result.passed) process.exitCode = 1;
