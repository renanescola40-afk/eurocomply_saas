import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-distributed-rate-limit-evidence.mjs';

const SHA = 'a'.repeat(40);
const temporaryDirectories: string[] = [];

function validEvidence() {
  const generatedAt = '2026-07-17T00:00:00.000Z';
  return {
    schemaVersion: 1,
    controlId: 'P1-04',
    control: 'distributed-rate-limit-sensitive-endpoints',
    status: 'Complete',
    evidenceKind: 'final-p1-control-evidence',
    generatedFromRealEvidence: true,
    productionValidated: true,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    nextReviewDue: '2026-10-15',
    environment: 'production',
    redaction: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    repository: 'renanescola40-afk/eurocomply_saas',
    targetSha: SHA,
    observedSha: SHA,
    sourceWorkflow: {
      name: 'Distributed Rate Limit Runtime Proof',
      runId: '12345',
      event: 'workflow_dispatch',
    },
    validation: {
      result: 'pass',
      validatedAt: generatedAt,
      validator: 'scripts/security/run-distributed-rate-limit-runtime-validation.mjs',
      method: 'Actual production-mode helper executed in independent Node.js processes against protected Upstash Redis.',
    },
    artifacts: [
      {
        type: 'protected-runtime-workflow',
        reference: 'github-actions-run:12345',
        description: 'Protected runtime execution.',
        collectedAt: generatedAt,
      },
      {
        type: 'exact-sha-source-contract',
        reference: `sha256:${'b'.repeat(64)}`,
        description: 'Exact-SHA source digest.',
        collectedAt: generatedAt,
      },
    ],
    rateLimitBackend: {
      provider: 'Upstash Redis',
      scope: 'distributed',
      evidenceLocation: 'github-actions-run:12345',
    },
    sensitiveEndpointsReviewed: [
      ['auth', '/api/auth/recovery', 'password-reset'],
      ['billing', '/api/billing/checkout', 'billing-checkout'],
      ['documents', '/api/documents/upload', 'upload'],
      ['team', '/api/team/invites', 'team-management'],
      ['audit', '/api/audit/chain/verify', 'audit-chain-verify'],
    ].map(([category, endpoint, limitPolicy]) => ({
      endpoint,
      category,
      limitPolicy,
      keyingStrategy: 'Organization, user, route, action and hashed request subject',
      status: 'enforced',
      evidenceLocation: `src/app${endpoint}/route.ts`,
    })),
    controlsVerified: [
      'Rate limit state is shared across instances',
      'Sensitive endpoints have explicit policies',
      'Bypass paths are documented or blocked',
      'Alerting exists for sustained throttling or abuse',
      'Evidence contains no secrets',
    ],
    runtimeProof: {
      independentProcessCount: 4,
      sharedSubjectKeyDigestMatched: true,
      firstRequestAllowed: true,
      secondRequestAllowed: true,
      thresholdRequestBlocked: true,
      isolatedSubjectAllowed: true,
      productionMissingBackendFailedClosed: true,
      highRiskAuditFlagObserved: true,
      retryAfterObserved: true,
      cleanupDeletedSharedKey: true,
      cleanupDeletedIsolatedKey: true,
    },
    sourceChecks: {
      distributedBackendContract: true,
      failClosedBypassContract: true,
      sustainedAbuseAlertContract: true,
      sensitiveEndpointCoverage: true,
    },
    checks: [{ name: 'all', passed: true }],
    failures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      redisUrlStored: false,
      redisTokenStored: false,
      rawRedisKeyStored: false,
      rawProviderResponseStored: false,
      customerDataStored: false,
      syntheticDataOnly: true,
      cleanupAttempted: true,
      manualBooleanProofAccepted: false,
      exactShaBound: true,
    },
    evidenceBoundary: 'This does not prove CDN or WAF rate limiting, Sentry delivery, provider SLA or every production route invocation.',
  };
}

function runChecker(evidence: unknown, expectedSha = SHA) {
  const directory = mkdtempSync(join(tmpdir(), 'rate-limit-evidence-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'evidence.json');
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`);
  return execFileSync(process.execPath, ['scripts/security/check-p1-rate-limit-evidence.mjs', path], {
    cwd: process.cwd(),
    env: { ...process.env, ENTERPRISE_EXPECTED_SHA: expectedSha },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('distributed rate-limit runtime proof', () => {
  it('uses the actual helper in isolated processes and never stores provider credentials or raw keys', () => {
    const worker = readFileSync('scripts/security/distributed-rate-limit-runtime-worker.mjs', 'utf8');
    const runner = readFileSync('scripts/security/run-distributed-rate-limit-runtime-validation.mjs', 'utf8');

    expect(worker).toContain("import('../../src/server/security/rate-limit.ts')");
    expect(worker).toContain('rateLimitModule.checkDistributedRateLimit(input)');
    expect(worker).toContain("operation === 'cleanup'");
    expect(runner).toContain("execFileSync(process.execPath, ['--no-warnings', '--experimental-strip-types', worker]");
    expect(runner).toContain('first = runWorker(root, sharedInput)');
    expect(runner).toContain('second = runWorker(root, sharedInput)');
    expect(runner).toContain('third = runWorker(root, sharedInput)');
    expect(runner).toContain('failClosed = runWorker(root, sharedInput, { withoutRedis: true })');
    expect(runner).toContain('rawRedisKeyStored: false');
    expect(runner).toContain('redisTokenStored: false');
    expect(runner).not.toContain('token: process.env.UPSTASH_REDIS_REST_TOKEN');
  });

  it('requires an explicit high-risk team policy and protected endpoint mappings', () => {
    const rateLimit = readFileSync('src/server/security/rate-limit.ts', 'utf8');
    const invite = readFileSync('src/app/api/team/invites/route.ts', 'utf8');
    const remove = readFileSync('src/app/api/team/members/remove/route.ts', 'utf8');
    const role = readFileSync('src/app/api/team/members/role/route.ts', 'utf8');
    const cancel = readFileSync('src/app/api/team/invitations/cancel/route.ts', 'utf8');

    expect(rateLimit).toContain("'team-management': policy('team-management', 'team'");
    expect(rateLimit).toContain("if (policyOrCategory === 'team') return 'team-management'");
    for (const source of [invite, remove, role, cancel]) {
      expect(source).toContain("policy: 'team-management'");
      expect(source).toContain("failureMode: 'fail-closed'");
      expect(source).toContain('requireTrustedMutation(request');
    }
  });

  it('routes only high-risk abuse and backend failures to sanitized centralized alerts', () => {
    const logger = readFileSync('src/server/observability/logger.ts', 'utf8');
    const response = readFileSync('src/lib/security/rate-limit-response.ts', 'utf8');

    expect(logger).toContain("rate_limit_blocked: 'none'");
    expect(logger).toContain("rate_limit_abuse_detected: 'high'");
    expect(logger).toContain("rate_limit_backend_unavailable: 'high'");
    expect(response).toContain('keyHash: hashAuditKey(result.key)');
    expect(response).not.toContain('key: result.key');
  });

  it('runs on every main SHA and retains redacted evidence even when the live proof fails', () => {
    const workflow = readFileSync('.github/workflows/distributed-rate-limit-runtime-proof.yml', 'utf8');

    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}');
    expect(workflow).toContain('UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('distributed-rate-limit-runtime-proof-${{ env.TARGET_SHA }}');
  });

  it('reruns the scorecard after successful exact-SHA runtime proofs', () => {
    const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
    const workflowRunSources = workflow
      .split('\n')
      .find((line) => line.trim().startsWith('workflows:'));

    expect(workflow).toContain('workflow_run:');
    expect(workflowRunSources).toBeDefined();
    expect(workflowRunSources).toContain('Distributed Rate Limit Runtime Proof');
    expect(workflowRunSources).toContain('Auth RBAC Tenant Proof');
    expect(workflow).toContain("if: github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("RATE_LIMIT_RUNTIME_SOURCE_RUN_ID: ${{ github.event.workflow_run.name == 'Distributed Rate Limit Runtime Proof'");
    expect(workflow).toContain('node scripts/enterprise/fetch-distributed-rate-limit-evidence.mjs');
    expect(workflow).toContain('node scripts/security/check-p1-rate-limit-evidence.mjs');
  });

  it('selects only a successful exact-SHA runtime run and validates artifact provenance', () => {
    const selected = selectExactShaRun([
      { id: 1, head_sha: SHA, status: 'completed', conclusion: 'failure', updated_at: '2026-07-17T00:00:00Z' },
      { id: 2, head_sha: 'b'.repeat(40), status: 'completed', conclusion: 'success', updated_at: '2026-07-17T01:00:00Z' },
      { id: 12345, head_sha: SHA, status: 'completed', conclusion: 'success', updated_at: '2026-07-17T02:00:00Z' },
    ], SHA);

    expect(selected?.id).toBe(12345);
    expect(selectExactShaRun([selected], SHA, '999')).toBeNull();
    expect(validateDownloadedEvidence(validEvidence(), {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: 12345,
    })).toEqual({ passed: true, failures: [] });
    expect(validateDownloadedEvidence({ ...validEvidence(), targetSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: 12345,
    }).passed).toBe(false);
  });

  it('accepts only complete exact-SHA runtime evidence', () => {
    expect(runChecker(validEvidence())).toContain('P1 rate limit evidence is valid');
  });

  it('rejects stale, manual, uncleaned or sensitive evidence', () => {
    expect(() => runChecker({ ...validEvidence(), observedSha: 'b'.repeat(40) })).toThrow();
    expect(() => runChecker({ ...validEvidence(), generatedFromRealEvidence: false })).toThrow();
    expect(() => runChecker({
      ...validEvidence(),
      runtimeProof: { ...validEvidence().runtimeProof, cleanupDeletedSharedKey: false },
    })).toThrow();
    expect(() => runChecker({
      ...validEvidence(),
      evidenceIntegrity: { ...validEvidence().evidenceIntegrity, redisTokenStored: true },
    })).toThrow();
  });
});
