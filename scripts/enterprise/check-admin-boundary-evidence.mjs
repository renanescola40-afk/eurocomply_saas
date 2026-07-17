#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUTPUT = 'artifacts/enterprise-readiness/admin-boundary-diagnostics.json';
const MAX_DIAGNOSTIC_CHARS = 24_000;
const FULL_SHA = /^[0-9a-f]{40}$/;

const checks = [
  {
    id: 'supabase_service_role_boundary',
    command: process.execPath,
    args: ['scripts/security/check-supabase-service-role-boundary.mjs'],
    env: {},
  },
  {
    id: 'strict_client_boundary_scan',
    command: process.execPath,
    args: ['scripts/security/check-client-boundaries.mjs'],
    env: { STRICT_CLIENT_BOUNDARY_SCAN: '1' },
  },
];

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 64 * 1024,
    }).trim().toLowerCase();
  } catch {
    return null;
  }
}

export function sanitizeDiagnosticOutput(value) {
  const source = String(value ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g, '[redacted-jwt]')
    .replace(/\b(?:sk|rk|pk|sbp|ghp|github_pat)_[A-Za-z0-9_-]{12,}\b/gi, '[redacted-credential]')
    .replace(/\b(password|secret|token|api[_-]?key|service[_-]?role[_-]?key)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .trim();

  if (source.length <= MAX_DIAGNOSTIC_CHARS) return source;
  return `${source.slice(0, MAX_DIAGNOSTIC_CHARS)}\n[diagnostic output truncated]`;
}

function reasonFor(result, exitCode) {
  if (result.error?.code === 'ETIMEDOUT') return 'timeout';
  if (result.error) return 'execution_error';
  return `exit_${exitCode ?? 'unknown'}`;
}

export function runAdminBoundaryDiagnostics({
  runner = spawnSync,
  environment = process.env,
  generatedAt = new Date().toISOString(),
  observedSha = gitHead(),
} = {}) {
  const targetSha = String(environment.TARGET_SHA || environment.GITHUB_SHA || '').trim().toLowerCase();
  const results = [];

  for (const check of checks) {
    const result = runner(check.command, check.args, {
      cwd: process.cwd(),
      env: { ...environment, ...check.env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const exitCode = Number.isInteger(result.status) ? result.status : null;
    const passed = exitCode === 0 && !result.error;
    const stdout = sanitizeDiagnosticOutput(result.stdout);
    const stderr = sanitizeDiagnosticOutput(result.stderr);

    results.push({
      id: check.id,
      status: passed ? 'PASS' : 'FAIL',
      exitCode,
      reason: passed ? null : reasonFor(result, exitCode),
      stdout,
      stderr,
      outputDigest: createHash('sha256').update(`${stdout}\n${stderr}`).digest('hex'),
    });
  }

  const failedChecks = results.filter((result) => result.status === 'FAIL').map((result) => result.id);
  const exactShaBound = FULL_SHA.test(targetSha) && observedSha === targetSha;
  const passed = failedChecks.length === 0 && exactShaBound;

  return {
    schema: 'risck-comply.admin-boundary-diagnostics.v1',
    evidenceItem: 'admin-boundary-diagnostics',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    repository: environment.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
    branch: environment.GITHUB_HEAD_REF || environment.GITHUB_REF_NAME || null,
    targetSha: FULL_SHA.test(targetSha) ? targetSha : null,
    observedSha: FULL_SHA.test(String(observedSha ?? '')) ? observedSha : null,
    checks: results,
    failedChecks,
    failures: [
      ...failedChecks.map((id) => `${id}_failed`),
      ...(exactShaBound ? [] : ['exact_sha_binding_failed']),
    ],
    summary: passed
      ? 'Both administrative-client boundary controls passed for the exact assessed SHA.'
      : `Administrative-client boundary diagnostics failed closed for ${failedChecks.length} control(s); inspect the redacted per-control output.`,
    evidenceBoundary: 'This artifact is redacted diagnostic output for repository controls only. It is not production provider evidence, tenant-isolation proof, or external assurance.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawEnvironmentStored: false,
      rawCredentialsStored: false,
      rawProviderPayloadsStored: false,
      outputTruncatedAtCharacters: MAX_DIAGNOSTIC_CHARS,
      exactShaBound,
    },
  };
}

export function writeAdminBoundaryDiagnostics(document, outputPath = process.env.ADMIN_BOUNDARY_DIAGNOSTICS_PATH || DEFAULT_OUTPUT) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  return outputPath;
}

function run() {
  const document = runAdminBoundaryDiagnostics();
  const outputPath = writeAdminBoundaryDiagnostics(document);

  for (const result of document.checks) {
    if (result.status === 'PASS') {
      console.log(`admin-boundary check passed: ${result.id}`);
      continue;
    }

    console.error(`::error title=Admin boundary validation failed::${result.id} failed (${result.reason})`);
    if (result.stdout) {
      console.error(`--- ${result.id} stdout ---`);
      console.error(result.stdout);
    }
    if (result.stderr) {
      console.error(`--- ${result.id} stderr ---`);
      console.error(result.stderr);
    }
  }

  console.log(`Admin boundary diagnostics artifact: ${outputPath}`);

  if (document.status !== 'Complete') {
    process.exitCode = 1;
  } else {
    console.log('All administrative-client boundary checks passed.');
  }
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run();
}
