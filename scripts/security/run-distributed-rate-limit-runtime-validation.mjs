#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const OUTPUT_PATH = 'docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json';
const REDACTION = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const REQUIRED_CONTROLS = [
  'Rate limit state is shared across instances',
  'Sensitive endpoints have explicit policies',
  'Bypass paths are documented or blocked',
  'Alerting exists for sustained throttling or abuse',
  'Evidence contains no secrets',
];

const ENDPOINT_CONTRACTS = [
  {
    endpoint: '/api/auth/recovery',
    category: 'auth',
    policy: 'password-reset',
    path: 'src/app/api/auth/recovery/route.ts',
    required: ["policy: 'password-reset'", "failureMode: 'fail-closed'", 'rateLimitResponse(result'],
    keyingStrategy: 'Privacy-safe email digest, client IP, route and action subject',
  },
  {
    endpoint: '/api/billing/checkout',
    category: 'billing',
    policy: 'billing-checkout',
    path: 'src/app/api/billing/checkout/route.ts',
    required: ['requireTrustedMutation(request', 'billing:checkout:', 'rateLimit: {'],
    keyingStrategy: 'Organization, authenticated user, route, action, hashed client IP and user agent',
  },
  {
    endpoint: '/api/documents/upload',
    category: 'documents',
    policy: 'upload',
    path: 'src/app/api/documents/upload/route.ts',
    required: ["policy: 'upload'", "failureMode: 'fail-closed'", 'rateLimitResponse(rateLimit'],
    keyingStrategy: 'Organization, authenticated user, route, action, hashed client IP and user agent',
  },
  {
    endpoint: '/api/team/invites',
    category: 'team',
    policy: 'team-management',
    path: 'src/app/api/team/invites/route.ts',
    required: ["policy: 'team-management'", "failureMode: 'fail-closed'", "action: 'team_invite_create'"],
    keyingStrategy: 'Organization, authenticated user, route, action, hashed client IP and user agent',
  },
  {
    endpoint: '/api/audit/chain/verify',
    category: 'audit',
    policy: 'audit-chain-verify',
    path: 'src/app/api/audit/chain/verify/route.ts',
    required: ["policy: 'audit-chain-verify'", 'rateLimitResponse(rateLimit'],
    keyingStrategy: 'Organization, authenticated user, route, action, hashed client IP and user agent',
  },
];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableFailureCode(error) {
  if (error && typeof error === 'object' && 'probeCode' in error) return String(error.probeCode);
  return 'runtime_probe_failed';
}

function assert(condition, code) {
  if (condition) return;
  const error = new Error(code);
  error.probeCode = code;
  throw error;
}

function gitHead(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().toLowerCase();
  } catch {
    return '';
  }
}

function runWorker(root, input, { operation = 'check', withoutRedis = false } = {}) {
  const worker = join(root, 'scripts/security/distributed-rate-limit-runtime-worker.mjs');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    RATE_LIMIT_IP_HASH_SALT: process.env.RATE_LIMIT_RUNTIME_PROBE_SALT,
    RATE_LIMIT_PROBE_INPUT: JSON.stringify(input),
    RATE_LIMIT_PROBE_OPERATION: operation,
  };

  if (withoutRedis) {
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
  }

  let output;
  try {
    output = execFileSync(process.execPath, ['--no-warnings', '--experimental-strip-types', worker], {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
      maxBuffer: 256 * 1024,
    }).trim();
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : '';
    try {
      const parsed = JSON.parse(stdout.split('\n').at(-1) || '{}');
      const wrapped = new Error(parsed.code || 'worker_failed');
      wrapped.probeCode = parsed.code || 'worker_failed';
      throw wrapped;
    } catch (parseError) {
      if (parseError && typeof parseError === 'object' && 'probeCode' in parseError) throw parseError;
      const wrapped = new Error('worker_failed');
      wrapped.probeCode = 'worker_failed';
      throw wrapped;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(output.split('\n').at(-1) || '{}');
  } catch {
    const error = new Error('worker_output_invalid');
    error.probeCode = 'worker_output_invalid';
    throw error;
  }
  assert(parsed.ok === true, parsed.code || 'worker_reported_failure');
  return parsed;
}

function evaluateSourceContracts(root) {
  const rateLimitSource = readFileSync(join(root, 'src/server/security/rate-limit.ts'), 'utf8');
  const responseSource = readFileSync(join(root, 'src/lib/security/rate-limit-response.ts'), 'utf8');
  const loggerSource = readFileSync(join(root, 'src/server/observability/logger.ts'), 'utf8');
  const apiGuardSource = readFileSync(join(root, 'src/server/security/api-guards.ts'), 'utf8');

  const backendContract = [
    "'team-management': policy('team-management', 'team'",
    "'fail-closed', true, true, true",
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    "['INCR', redisKey]",
    "['EXPIRE', redisKey, windowSeconds, 'NX']",
    "['TTL', redisKey]",
    "reason: 'redis_not_configured'",
    "reason: 'redis_request_failed'",
    "reason: 'redis_unavailable'",
  ].every((token) => rateLimitSource.includes(token));

  const bypassContract = [
    "const failureMode = isProductionRuntime() && policy.highRisk",
    "? 'fail-closed'",
    "return inferPolicyId(legacyKey) ?? 'auth'",
  ].every((token) => rateLimitSource.includes(token))
    && apiGuardSource.includes('return requireRateLimit({')
    && apiGuardSource.includes('checkDistributedRateLimit(options)');

  const alertingContract = [
    "rate_limit_abuse_detected: 'high'",
    "rate_limit_backend_unavailable: 'high'",
    "scope.setFingerprint(['security-alert', event])",
  ].every((token) => loggerSource.includes(token))
    && responseSource.includes("result.reason ? 'rate_limit_backend_unavailable' : 'rate_limit_abuse_detected'")
    && responseSource.includes('keyHash: hashAuditKey(result.key)')
    && !responseSource.includes('key: result.key');

  const endpoints = ENDPOINT_CONTRACTS.map((contract) => {
    const source = readFileSync(join(root, contract.path), 'utf8');
    const routePassed = contract.required.every((token) => source.includes(token));
    const centralPolicyPassed = rateLimitSource.includes(`'${contract.policy}'`)
      || rateLimitSource.includes(`${contract.policy}: policy(`)
      || rateLimitSource.includes(`'${contract.policy}': policy(`);
    return {
      ...contract,
      passed: routePassed && centralPolicyPassed,
      sourceDigest: digest(source),
    };
  });

  return {
    backendContract,
    bypassContract,
    alertingContract,
    endpoints,
    endpointCoverage: endpoints.every((endpoint) => endpoint.passed),
    sourceDigests: {
      rateLimit: digest(rateLimitSource),
      rateLimitResponse: digest(responseSource),
      logger: digest(loggerSource),
      apiGuards: digest(apiGuardSource),
    },
  };
}

function evidenceEndpoint(endpoint) {
  return {
    endpoint: endpoint.endpoint,
    category: endpoint.category,
    limitPolicy: endpoint.policy,
    keyingStrategy: endpoint.keyingStrategy,
    status: endpoint.passed ? 'enforced' : 'open',
    evidenceLocation: endpoint.path,
  };
}

function nextReviewDate(generatedAt) {
  const next = new Date(generatedAt);
  next.setUTCDate(next.getUTCDate() + 90);
  return next.toISOString().slice(0, 10);
}

function writeEvidence(root, evidence) {
  const output = join(root, OUTPUT_PATH);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const generatedAt = new Date().toISOString();
  const targetSha = String(process.env.ENTERPRISE_EXPECTED_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const observedSha = gitHead(root);
  const repository = process.env.GITHUB_REPOSITORY || '';
  const runId = String(process.env.GITHUB_RUN_ID || '');
  const eventName = process.env.GITHUB_EVENT_NAME || 'unknown';
  const failures = [];
  const checks = {
    trustedGitHubActions: process.env.GITHUB_ACTIONS === 'true',
    canonicalRepository: repository === CANONICAL_REPOSITORY,
    fullTargetSha: FULL_SHA.test(targetSha),
    exactCheckout: observedSha === targetSha,
    productionEnvironment: process.env.RATE_LIMIT_RUNTIME_TARGET_ENVIRONMENT === 'production',
    redisSecretsPresent: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    probeSaltPresent: Boolean(process.env.RATE_LIMIT_RUNTIME_PROBE_SALT),
    numericRunId: /^\d+$/.test(runId),
    sourceContracts: false,
    sharedAcrossProcesses: false,
    thresholdEnforced: false,
    subjectIsolation: false,
    highRiskFailClosed: false,
    cleanupCompleted: false,
  };

  const source = evaluateSourceContracts(root);
  checks.sourceContracts = source.backendContract
    && source.bypassContract
    && source.alertingContract
    && source.endpointCoverage;

  const sharedInput = {
    policy: 'team-management',
    limit: 2,
    windowMs: 120_000,
    userId: `runtime-user-${targetSha.slice(0, 12)}`,
    organizationId: '00000000-0000-4000-8000-000000000901',
    ip: '192.0.2.91',
    userAgent: `risck-comply-rate-limit-runtime-proof/${runId}`,
    action: 'runtime_shared_state_probe',
    route: '/runtime-proof/distributed-rate-limit',
  };
  const isolatedInput = {
    ...sharedInput,
    userId: `runtime-isolated-${targetSha.slice(0, 12)}`,
    ip: '192.0.2.92',
  };

  let first = null;
  let second = null;
  let third = null;
  let isolated = null;
  let failClosed = null;
  let cleanupShared = null;
  let cleanupIsolated = null;

  try {
    for (const [name, passed] of Object.entries(checks)) {
      if (['sourceContracts', 'sharedAcrossProcesses', 'thresholdEnforced', 'subjectIsolation', 'highRiskFailClosed', 'cleanupCompleted'].includes(name)) continue;
      if (!passed) failures.push(name);
    }
    assert(failures.length === 0, failures[0] || 'provenance_validation_failed');

    first = runWorker(root, sharedInput);
    second = runWorker(root, sharedInput);
    third = runWorker(root, sharedInput);
    isolated = runWorker(root, isolatedInput);
    failClosed = runWorker(root, sharedInput, { withoutRedis: true });

    checks.sharedAcrossProcesses = first.allowed === true
      && first.remaining === 1
      && second.allowed === true
      && second.remaining === 0
      && first.keyHash === second.keyHash
      && second.keyHash === third.keyHash;
    checks.thresholdEnforced = third.allowed === false
      && third.remaining === 0
      && third.audit === true
      && third.reason === null
      && third.policy === 'team-management'
      && third.category === 'team'
      && third.highRisk === true
      && third.failureMode === 'fail-closed'
      && Number(third.retryAfterSeconds) > 0;
    checks.subjectIsolation = isolated.allowed === true
      && isolated.remaining === 1
      && isolated.keyHash !== first.keyHash;
    checks.highRiskFailClosed = failClosed.allowed === false
      && failClosed.audit === true
      && failClosed.reason === 'redis_not_configured'
      && failClosed.failureMode === 'fail-closed'
      && failClosed.highRisk === true;
  } catch (error) {
    failures.push(stableFailureCode(error));
  } finally {
    if (checks.redisSecretsPresent && checks.probeSaltPresent) {
      try {
        cleanupShared = runWorker(root, sharedInput, { operation: 'cleanup' });
        cleanupIsolated = runWorker(root, isolatedInput, { operation: 'cleanup' });
        checks.cleanupCompleted = cleanupShared.deleted >= 1 && cleanupIsolated.deleted >= 1;
        if (!checks.cleanupCompleted) failures.push('probe_cleanup_incomplete');
      } catch (error) {
        failures.push(stableFailureCode(error));
      }
    }
  }

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed && !failures.includes(name)) failures.push(name);
  }

  const passed = failures.length === 0 && Object.values(checks).every(Boolean);
  const sourceRunReference = `github-actions-run:${runId}`;
  const evidence = {
    schemaVersion: 1,
    controlId: 'P1-04',
    control: 'distributed-rate-limit-sensitive-endpoints',
    status: passed ? 'Complete' : 'Open',
    evidenceKind: 'final-p1-control-evidence',
    generatedFromRealEvidence: passed,
    productionValidated: passed,
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    nextReviewDue: nextReviewDate(generatedAt),
    environment: 'production',
    redaction: REDACTION,
    repository,
    targetSha,
    observedSha,
    sourceWorkflow: {
      name: 'Distributed Rate Limit Runtime Proof',
      runId,
      event: eventName,
    },
    validation: {
      result: passed ? 'pass' : 'fail',
      validatedAt: generatedAt,
      validator: 'scripts/security/run-distributed-rate-limit-runtime-validation.mjs',
      method: 'Actual production-mode rate-limit helper executed in independent Node.js processes against one protected Upstash Redis namespace, followed by threshold, subject-isolation, fail-closed and cleanup checks.',
    },
    artifacts: [
      {
        type: 'protected-runtime-workflow',
        reference: sourceRunReference,
        description: 'Protected exact-SHA GitHub Actions execution; provider URL, token and probe keys are not stored.',
        collectedAt: generatedAt,
      },
      {
        type: 'exact-sha-source-contract',
        reference: `sha256:${digest(JSON.stringify(source.sourceDigests))}`,
        description: 'Digest of the distributed backend, security response, alert-routing and API-guard source contracts.',
        collectedAt: generatedAt,
      },
    ],
    rateLimitBackend: {
      provider: 'Upstash Redis',
      scope: 'distributed',
      evidenceLocation: sourceRunReference,
      notes: 'Shared state was observed across independent Node.js processes using the actual production-mode rate-limit helper. Provider host, token, Redis key and raw responses are omitted.',
    },
    sensitiveEndpointsReviewed: source.endpoints.map(evidenceEndpoint),
    controlsVerified: passed ? REQUIRED_CONTROLS : [],
    runtimeProof: {
      independentProcessCount: 4,
      sharedSubjectKeyDigestMatched: Boolean(first && second && third && first.keyHash === second.keyHash && second.keyHash === third.keyHash),
      firstRequestAllowed: first?.allowed === true,
      secondRequestAllowed: second?.allowed === true,
      thresholdRequestBlocked: third?.allowed === false,
      isolatedSubjectAllowed: isolated?.allowed === true,
      productionMissingBackendFailedClosed: failClosed?.reason === 'redis_not_configured' && failClosed?.allowed === false,
      highRiskAuditFlagObserved: third?.audit === true,
      retryAfterObserved: Number(third?.retryAfterSeconds) > 0,
      cleanupDeletedSharedKey: Number(cleanupShared?.deleted) >= 1,
      cleanupDeletedIsolatedKey: Number(cleanupIsolated?.deleted) >= 1,
    },
    sourceChecks: {
      distributedBackendContract: source.backendContract,
      failClosedBypassContract: source.bypassContract,
      sustainedAbuseAlertContract: source.alertingContract,
      sensitiveEndpointCoverage: source.endpointCoverage,
      sourceDigests: source.sourceDigests,
    },
    checks: Object.entries(checks).map(([name, value]) => ({ name, passed: value === true })),
    failures: [...new Set(failures)],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      redisUrlStored: false,
      redisTokenStored: false,
      rawRedisKeyStored: false,
      rawProviderResponseStored: false,
      customerDataStored: false,
      syntheticDataOnly: true,
      cleanupAttempted: cleanupShared !== null || cleanupIsolated !== null,
      manualBooleanProofAccepted: false,
      exactShaBound: checks.exactCheckout,
    },
    evidenceBoundary: 'This artifact proves that the exact assessed repository SHA executed the real production-mode rate-limit helper against a protected Upstash Redis backend, shared state across independent processes, blocked above a synthetic threshold, isolated distinct subjects, failed closed without the backend and cleaned up synthetic keys. It does not prove CDN or WAF rate limiting, Sentry delivery, every production route invocation, provider SLA, or absence of all abuse.',
  };

  writeEvidence(root, evidence);
  if (!passed) process.exitCode = 1;
}

main().catch(() => {
  process.exitCode = 1;
});
