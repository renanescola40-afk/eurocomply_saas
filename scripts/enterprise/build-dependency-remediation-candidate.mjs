#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { buildDependencyVulnerabilityEvidence } from './build-dependency-vulnerability-evidence.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const DEFAULT_DIR = 'artifacts/enterprise-readiness/dependency-remediation-candidate';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function run(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: MAX_OUTPUT_BYTES,
    env: {
      ...process.env,
      npm_config_audit: 'true',
      npm_config_fund: 'false',
    },
  });
}

function auditResult(result) {
  if (result.error || ![0, 1].includes(result.status)) {
    return {
      audit: null,
      commandCompleted: false,
      commandExitCode: Number.isInteger(result.status) ? result.status : null,
      commandFailure: result.error
        ? `npm_audit_command_error:${result.error.message}`
        : 'npm_audit_command_failed',
    };
  }
  try {
    return {
      audit: JSON.parse(result.stdout),
      commandCompleted: true,
      commandExitCode: result.status,
      commandFailure: null,
    };
  } catch {
    return {
      audit: null,
      commandCompleted: false,
      commandExitCode: result.status,
      commandFailure: 'npm_audit_output_invalid_json',
    };
  }
}

export function summarizeRemediationCandidate({
  sourceSha,
  generatedAt,
  manifestUnchanged,
  lockfileChanged,
  originalLockfileSha256,
  candidateLockfileSha256,
  fixCommandExitCode,
  evidence,
} = {}) {
  const policyWouldPass = evidence?.audit?.policyPassed === true;
  return {
    schema: 'risck-comply.dependency-remediation-candidate.v1',
    status: policyWouldPass && manifestUnchanged ? 'CandidateReady' : 'CandidatePartial',
    sourceSha,
    generatedAt,
    strategy: 'npm audit fix --package-lock-only --ignore-scripts',
    breakingUpgradeAllowed: false,
    commitBoundEvidence: false,
    manifestUnchanged,
    lockfileChanged,
    originalLockfileSha256,
    candidateLockfileSha256,
    fixCommandExitCode,
    policyWouldPass,
    remainingSeverityCounts: evidence?.audit?.severityCounts ?? null,
    remainingVulnerablePackages: evidence?.audit?.vulnerablePackages ?? [],
    remainingFailures: evidence?.failures ?? ['candidate_evaluation_missing'],
    candidatePath: 'package-lock.candidate.json',
    evidenceBoundary:
      'This is a non-breaking remediation candidate generated from one source SHA. It is not release evidence and cannot affect the scorecard until the lockfile is intentionally committed and all exact-SHA checks pass.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawAuditPayloadStored: false,
      registryCredentialsStored: false,
      sourceShaValid: FULL_SHA.test(String(sourceSha ?? '')),
    },
  };
}

export function buildDependencyRemediationCandidate({
  sourceSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  repository = process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  branch =
    process.env.TARGET_BRANCH ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    'main',
  outputDir = process.env.DEPENDENCY_REMEDIATION_CANDIDATE_DIR || DEFAULT_DIR,
  generatedAt = new Date().toISOString(),
} = {}) {
  const originalManifest = readFileSync('package.json');
  const originalLockfile = readFileSync('package-lock.json');
  const originalLockfileSha256 = sha256(originalLockfile);

  try {
    const fix = run('npm', [
      'audit',
      'fix',
      '--package-lock-only',
      '--ignore-scripts',
    ]);

    const candidateManifest = readFileSync('package.json');
    const candidateLockfile = readFileSync('package-lock.json');
    const candidateLockfileSha256 = sha256(candidateLockfile);
    const manifestUnchanged = originalManifest.equals(candidateManifest);
    const lockfileChanged = originalLockfileSha256 !== candidateLockfileSha256;

    const audit = auditResult(
      run('npm', ['audit', '--audit-level=moderate', '--json']),
    );
    let lockfile = null;
    try {
      lockfile = JSON.parse(candidateLockfile.toString('utf8'));
    } catch {
      lockfile = null;
    }
    const evidence = buildDependencyVulnerabilityEvidence({
      audit: audit.audit,
      lockfile,
      targetSha: sourceSha,
      repository,
      branch,
      generatedAt,
      commandCompleted: audit.commandCompleted,
      commandExitCode: audit.commandExitCode,
      commandFailure: audit.commandFailure,
    });
    const summary = summarizeRemediationCandidate({
      sourceSha,
      generatedAt,
      manifestUnchanged,
      lockfileChanged,
      originalLockfileSha256,
      candidateLockfileSha256,
      fixCommandExitCode: Number.isInteger(fix.status) ? fix.status : null,
      evidence,
    });

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'package-lock.candidate.json'), candidateLockfile, {
      mode: 0o600,
    });
    writeFileSync(
      join(outputDir, 'dependency-remediation-candidate.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      { mode: 0o600 },
    );

    console.log(
      `Dependency remediation candidate: ${summary.status}; remaining vulnerabilities: ${
        summary.remainingSeverityCounts?.total ?? 'unknown'
      }`,
    );
    console.log(`Candidate artifacts: ${outputDir}`);
    return summary;
  } finally {
    writeFileSync('package.json', originalManifest);
    writeFileSync('package-lock.json', originalLockfile);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    buildDependencyRemediationCandidate();
  } catch (error) {
    const outputDir = process.env.DEPENDENCY_REMEDIATION_CANDIDATE_DIR || DEFAULT_DIR;
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, 'dependency-remediation-candidate.json'),
      `${JSON.stringify({
        schema: 'risck-comply.dependency-remediation-candidate.v1',
        status: 'CandidateError',
        sourceSha: process.env.TARGET_SHA || process.env.GITHUB_SHA || null,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        commitBoundEvidence: false,
      }, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.error('Dependency remediation candidate generation failed.');
    process.exitCode = 1;
  }
}
