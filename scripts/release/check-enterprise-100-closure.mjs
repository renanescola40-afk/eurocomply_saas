#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { resolveEvidenceShaBinding } from './evidence-sha-binding.mjs';
import { validateExternalSecurityReviewEvidence } from './validate-external-security-review-evidence.mjs';

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
  const decisionCandidates = [
    document?.publicationStatus,
    document?.finalDecision,
    document?.releaseDecision,
    document?.decision,
    document?.result,
    document?.summary?.decision,
  ];
  for (const candidate of decisionCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return normalise(candidate);
  }

  const status = normalise(document?.status);
  const outcome = normalise(document?.validationStatus ?? document?.outcome);
  const completeStatuses = new Set(['COMPLETE', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'PASS', 'PASSED']);
  const passingOutcomes = new Set(['PASS', 'PASSED', 'SUCCESS', 'SUCCESSFUL', 'GO', 'VERIFIED']);

  if (completeStatuses.has(status) && passingOutcomes.has(outcome)) return 'PASS';
  if (status) return status;
  if (outcome) return outcome;

  const summaryStatus = document?.summary?.status;
  if (typeof summaryStatus === 'string' && summaryStatus.trim()) return normalise(summaryStatus);

  if (document?.success === true || document?.passed === true || document?.ok === true) {
    return 'SUCCESS';
  }

  return null;
}

function digest(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function containsSensitiveValues(document) {
  return document?.evidenceIntegrity?.containsSensitiveValues === true
    || document?.containsSensitiveValues === true
    || document?.containsSecrets === true
    || document?.secretsRedacted === false;
}

function configuredEvidenceRoots() {
  const configured = String(process.env.ENTERPRISE_CLOSURE_EVIDENCE_ROOTS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolve(root, item));
  return [...configured, root];
}

function evidenceCandidates(evidencePath, evidenceRoots) {
  const seen = new Set();
  return evidenceRoots
    .map((evidenceRoot) => join(evidenceRoot, evidencePath))
    .filter((absolutePath) => {
      if (!existsSync(absolutePath) || seen.has(absolutePath)) return false;
      seen.add(absolutePath);
      return true;
    });
}

function failureControl(control, overrides = {}) {
  return {
    id: control.id,
    owner: control.owner,
    evidence: control.evidence,
    status: null,
    sha: null,
    shaMatches: false,
    accepted: false,
    source: null,
    ...overrides,
  };
}

export function evaluateEnterpriseClosure({
  expectedSha = process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA?.trim() || process.env.GITHUB_SHA?.trim() || null,
  config = readJson(configPath).value,
  evidenceRoots = configuredEvidenceRoots(),
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
    const paths = evidenceCandidates(control.evidence, evidenceRoots);
    if (paths.length === 0) {
      return failureControl(control, {
        status: 'MISSING',
        reason: 'evidence_missing',
      });
    }

    const parsedCandidates = paths.map((absolutePath) => {
      const parsed = readJson(absolutePath);
      const shaBinding = parsed.value ? resolveEvidenceShaBinding(parsed.value) : null;
      return {
        absolutePath,
        value: parsed.value,
        error: parsed.error,
        digest: parsed.value ? digest(absolutePath) : null,
        status: parsed.value ? findStatus(parsed.value) : null,
        sha: shaBinding?.sha ?? null,
        shaSource: shaBinding?.source ?? null,
        shaConflict: shaBinding?.conflict === true,
        sensitive: parsed.value ? containsSensitiveValues(parsed.value) : false,
      };
    });
    const parseable = parsedCandidates.filter((candidate) => candidate.value);
    if (parseable.length === 0) {
      return failureControl(control, {
        status: 'INVALID',
        reason: 'invalid_json',
        candidateCount: paths.length,
      });
    }

    const safe = parseable.filter((candidate) => !candidate.sensitive);
    if (safe.length === 0) {
      return failureControl(control, {
        status: 'REJECTED',
        reason: 'sensitive_evidence_rejected',
        candidateCount: parseable.length,
      });
    }

    const exact = safe.filter((candidate) =>
      !candidate.shaConflict && Boolean(expectedSha && candidate.sha === expectedSha),
    );
    if (exact.length === 0) {
      const conflicting = safe.find((candidate) => candidate.shaConflict);
      const diagnostic = conflicting ?? safe[0];
      return failureControl(control, {
        status: conflicting ? 'SHA_CONFLICT' : diagnostic.status,
        sha: diagnostic.sha,
        shaSource: diagnostic.shaSource,
        source: diagnostic.absolutePath,
        digest: diagnostic.digest,
        reason: conflicting ? 'conflicting_sha_bindings' : 'exact_sha_not_proven',
        candidateCount: safe.length,
      });
    }

    const exactDigests = new Set(exact.map((candidate) => candidate.digest));
    if (exactDigests.size > 1) {
      return failureControl(control, {
        status: 'AMBIGUOUS',
        sha: expectedSha,
        shaMatches: true,
        reason: 'ambiguous_exact_sha_evidence',
        candidateCount: exact.length,
        digests: [...exactDigests].sort(),
      });
    }

    const selected = exact[0];
    const acceptedStatuses = (control.acceptedStatuses ?? []).map(normalise);
    const statusAccepted = selected.status !== null && acceptedStatuses.includes(selected.status);
    const semanticFailures = control.id === 'external-security-assurance'
      ? validateExternalSecurityReviewEvidence(selected.value, {
          expectedCommitSha: expectedSha,
          now: new Date(),
        })
      : [];
    const accepted = statusAccepted && semanticFailures.length === 0;

    return {
      id: control.id,
      owner: control.owner,
      evidence: control.evidence,
      source: selected.absolutePath,
      digest: selected.digest,
      status: selected.status,
      sha: selected.sha,
      shaSource: selected.shaSource,
      shaMatches: true,
      accepted: statusAccepted && semanticFailures.length === 0,
      reason: accepted
        ? null
        : semanticFailures.length > 0
          ? 'semantic_evidence_contract_failed'
          : 'status_not_accepted',
      validationFailures: semanticFailures,
      equivalentCandidateCount: exact.length,
    };
  });

  const blockers = controls
    .filter((control) => !control.accepted)
    .map((control) => `${control.id}:${control.reason}`);
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
    truthBoundary: 'Closure credit requires an accepted status, an exact non-conflicting promoted SHA, and any registered semantic evidence validator. External security assurance is independently validated against its exact-SHA assessor/authorization/report/findings/retest contract. Configured evidence roots only make retained proof discoverable; they do not create or upgrade evidence.',
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
