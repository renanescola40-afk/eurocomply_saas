import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import {
  runAdminBoundaryDiagnostics,
  sanitizeDiagnosticOutput,
} from '../../scripts/enterprise/check-admin-boundary-evidence.mjs';

const script = readFileSync('scripts/enterprise/check-admin-boundary-evidence.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
const SHA = 'a'.repeat(40);
const passwordFixture = ['pass', 'word=', 'fixture-value'].join('');
const tokenFixture = ['to', 'ken=', 'fixture-value'].join('');
const providerKeyFixture = ['sk', '_live_', 'fixture-value-with-sufficient-length'].join('');

function runnerWithStatuses(statuses: number[]) {
  let index = 0;
  const runner = () => {
    const status = statuses[index] ?? 1;
    index += 1;
    const stdout = status === 0
      ? 'boundary check ok'
      : 'Client boundary findings:\n- src/example.ts:1 unsafe import';
    const stderr = status === 0 ? '' : tokenFixture;

    return {
      pid: 123,
      output: [null, stdout, stderr],
      stdout,
      stderr,
      status,
      signal: null,
      error: undefined,
    };
  };

  return runner as unknown as typeof spawnSync;
}

function diagnosticEnvironment(values: Record<string, string>) {
  return { ...process.env, ...values };
}

describe('enterprise admin boundary diagnostics', () => {
  it('runs both administrative-client boundary gates independently', () => {
    expect(script).toContain('check-supabase-service-role-boundary.mjs');
    expect(script).toContain('check-client-boundaries.mjs');
    expect(script).toContain("STRICT_CLIENT_BOUNDARY_SCAN: '1'");
    expect(script).toContain('for (const check of checks)');
  });

  it('writes a complete exact-SHA document only when both gates pass', () => {
    const document = runAdminBoundaryDiagnostics({
      runner: runnerWithStatuses([0, 0]),
      environment: diagnosticEnvironment({
        TARGET_SHA: SHA,
        GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
        GITHUB_HEAD_REF: 'feature/example',
      }),
      observedSha: SHA,
      generatedAt: '2026-07-17T00:00:00.000Z',
    });

    expect(document.status).toBe('Complete');
    expect(document.outcome).toBe('passed');
    expect(document.failedChecks).toEqual([]);
    expect(document.failures).toEqual([]);
    expect(document.checks.map((check) => check.status)).toEqual(['PASS', 'PASS']);
    expect(document.evidenceIntegrity.exactShaBound).toBe(true);
  });

  it('fails closed and retains redacted per-control diagnostics', () => {
    const document = runAdminBoundaryDiagnostics({
      runner: runnerWithStatuses([1, 0]),
      environment: diagnosticEnvironment({
        TARGET_SHA: SHA,
        GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
      }),
      observedSha: SHA,
    });

    expect(document.status).toBe('Open');
    expect(document.outcome).toBe('failed');
    expect(document.failedChecks).toEqual(['supabase_service_role_boundary']);
    expect(document.failures).toContain('supabase_service_role_boundary_failed');
    expect(document.checks[0]).toMatchObject({
      id: 'supabase_service_role_boundary',
      status: 'FAIL',
      exitCode: 1,
      reason: 'exit_1',
    });
    expect(document.checks[0]?.stdout).toContain('src/example.ts:1 unsafe import');
    expect(document.checks[0]?.stderr).toBe('token=[redacted]');
    expect(JSON.stringify(document)).not.toContain('fixture-value');
  });

  it('does not promote results when exact SHA binding is absent', () => {
    const document = runAdminBoundaryDiagnostics({
      runner: runnerWithStatuses([0, 0]),
      environment: diagnosticEnvironment({ TARGET_SHA: SHA }),
      observedSha: 'b'.repeat(40),
    });

    expect(document.status).toBe('Open');
    expect(document.failures).toContain('exact_sha_binding_failed');
    expect(document.evidenceIntegrity.exactShaBound).toBe(false);
  });

  it('redacts credential-like values and bounds diagnostic output', () => {
    const sanitized = sanitizeDiagnosticOutput(`${passwordFixture}\n${tokenFixture}\n${providerKeyFixture}\n${'x'.repeat(30_000)}`);

    expect(sanitized).not.toContain('fixture-value');
    expect(sanitized).toContain('[redacted]');
    expect(sanitized).toContain('[redacted-credential]');
    expect(sanitized).toContain('[diagnostic output truncated]');
  });

  it('executes diagnostics before repository evidence generation and uploads them even on failure', () => {
    const diagnosticIndex = workflow.indexOf('Run administrative-client boundary diagnostics');
    const uploadIndex = workflow.indexOf('Retain administrative-client boundary diagnostics');
    const evidenceIndex = workflow.indexOf('Build exact-SHA repository control evidence');

    expect(diagnosticIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeGreaterThan(diagnosticIndex);
    expect(evidenceIndex).toBeGreaterThan(uploadIndex);
    expect(workflow).toContain('ADMIN_BOUNDARY_DIAGNOSTICS_PATH: artifacts/enterprise-readiness/admin-boundary-diagnostics.json');
    expect(workflow).toContain('admin-boundary-diagnostics-${{ env.ASSESSED_SHA }}');
    expect(workflow).toContain('path: artifacts/enterprise-readiness/admin-boundary-diagnostics.json');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('node scripts/enterprise/check-admin-boundary-evidence.mjs');
  });

  it('keeps the diagnostic gate fail closed', () => {
    expect(script).toContain('Admin boundary validation failed');
    expect(script).toContain('process.exitCode = 1');
    expect(script).not.toContain('process.exitCode = 0');
    expect(script).not.toContain('continue-on-error');
  });
});
