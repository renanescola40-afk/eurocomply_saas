#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_GITHUB_CHECKS = 'artifacts/enterprise-readiness/github-checks-evidence.json';

const OUTPUTS = {
  originGuards: 'docs/security/evidence/runtime/origin-guard-validation.json',
  authorizationBola: 'docs/security/evidence/runtime/authorization-bola-validation.json',
  adminBoundary: 'docs/security/evidence/runtime/supabase-admin-boundary-validation.json',
  exportIsolation: 'docs/security/evidence/runtime/export-tenant-isolation-validation.json',
  structuredLogs: 'docs/security/evidence/runtime/centralized-logging-validation.json',
  requestIds: 'docs/security/evidence/runtime/request-id-validation.json',
  internalJobs: 'docs/security/evidence/runtime/internal-jobs-validation.json',
  vulnerabilityDisclosure: 'docs/security/evidence/release/vulnerability-disclosure-validation.json',
};

const SOURCE_PATHS = [
  'package.json',
  '.github/workflows/full-security-suite.yml',
  'scripts/security/check-origin-guards.mjs',
  'scripts/security/check-authorization-bola.mjs',
  'scripts/security/check-supabase-service-role-boundary.mjs',
  'scripts/security/check-client-boundaries.mjs',
  'scripts/security/check-csv-export-security.mjs',
  'scripts/security/check-log-sanitization.mjs',
  'scripts/security/check-internal-maintenance-jobs.mjs',
  'src/lib/observability/request-correlation.test.ts',
  'src/middleware.request-correlation.test.ts',
  'src/server/jobs/internal-batch-response.test.ts',
  'tests/security/internal-batch-results.test.ts',
  'src/lib/trust-center/content.ts',
  'src/lib/trust-center/routes.ts',
  'tests/e2e/route-health.spec.ts',
];

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function checkPassed(document, name) {
  const check = document?.checks?.find((item) => item?.name === name);
  return check?.status === 'PASS' || check?.passed === true || check?.success === true;
}

function includesAll(value, tokens) {
  return tokens.every((token) => value.includes(token));
}

export function evaluateSourceContracts(sources) {
  const packageJson = sources['package.json'] ?? '';
  const fullSuite = sources['.github/workflows/full-security-suite.yml'] ?? '';
  const disclosure = sources['src/lib/trust-center/content.ts'] ?? '';
  const disclosureRoutes = sources['src/lib/trust-center/routes.ts'] ?? '';
  const routeHealth = sources['tests/e2e/route-health.spec.ts'] ?? '';

  return {
    originGuards: includesAll(packageJson, ['"security:origin-guards"', 'check-origin-guards.mjs'])
      && fullSuite.includes('npm run security:ci'),
    authorizationBola: includesAll(packageJson, ['"security:authorization-bola"', 'check-authorization-bola.mjs'])
      && fullSuite.includes('npm run security:ci'),
    adminBoundary: includesAll(
      sources['scripts/security/check-supabase-service-role-boundary.mjs'] ?? '',
      ['NEXT_PUBLIC_', 'service role boundary', 'process.exitCode = 1'],
    )
      && includesAll(
        sources['scripts/security/check-client-boundaries.mjs'] ?? '',
        ['serverOnlyImportPatterns', "'@/lib/supabase/admin'", 'STRICT_CLIENT_BOUNDARY_SCAN'],
      ),
    exportIsolation: includesAll(packageJson, ['"security:csv-exports"', 'check-csv-export-security.mjs'])
      && fullSuite.includes('npm run security:ci'),
    structuredLogs: includesAll(packageJson, ['"security:logs"', 'check-log-sanitization.mjs'])
      && fullSuite.includes('npm run security:ci'),
    requestIds: includesAll(
      sources['src/lib/observability/request-correlation.test.ts'] ?? '',
      ['request', 'correlation'],
    )
      && includesAll(sources['src/middleware.request-correlation.test.ts'] ?? '', ['request', 'id']),
    internalJobs: includesAll(
      sources['scripts/security/check-internal-maintenance-jobs.mjs'] ?? '',
      ['fail closed in production', 'noStoreJson', 'process.exitCode = 1'],
    )
      && includesAll(
        sources['src/server/jobs/internal-batch-response.test.ts'] ?? '',
        ['partial', 'failed'],
      )
      && includesAll(sources['tests/security/internal-batch-results.test.ts'] ?? '', ['partial', 'failed']),
    vulnerabilityDisclosure: includesAll(
      disclosure,
      ['Vulnerability Disclosure', 'Responsible disclosure channel active', 'Reporting contact'],
    )
      && includesAll(disclosureRoutes, ["['vulnera', 'bility-disclosure'].join('')", 'TRUST_CENTER_ROUTES'])
      && routeHealth.includes('vulnerability-disclosure'),
  };
}

export function evaluateExactShaChecks(githubChecks, targetSha) {
  return {
    evidenceComplete: githubChecks?.status === 'Complete' && githubChecks?.outcome === 'passed',
    exactSha: githubChecks?.targetSha === targetSha,
    unitTests: checkPassed(githubChecks, 'unitTests'),
    e2e: checkPassed(githubChecks, 'e2e'),
    publicClaims: checkPassed(githubChecks, 'publicClaims'),
    securityCi: checkPassed(githubChecks, 'securityCi'),
    fullSecuritySuite: checkPassed(githubChecks, 'fullSecuritySuite'),
    requiredChecks: checkPassed(githubChecks, 'requiredChecks'),
  };
}

function command(root, executable, args, environment = {}) {
  try {
    execFileSync(executable, args, {
      cwd: root,
      env: { ...process.env, ...environment },
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 180_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { passed: true, exitCode: 0 };
  } catch (error) {
    const status = Number(error?.status);
    return { passed: false, exitCode: Number.isInteger(status) ? status : null };
  }
}

export function runFocusedValidation(root) {
  const node = process.execPath;
  const vitest = join(root, 'node_modules', '.bin', 'vitest');

  return {
    originGuards: command(root, node, ['scripts/security/check-origin-guards.mjs']),
    authorizationBola: command(root, node, ['scripts/security/check-authorization-bola.mjs']),
    adminBoundary: {
      passed: command(root, node, ['scripts/security/check-supabase-service-role-boundary.mjs']).passed
        && command(
          root,
          node,
          ['scripts/security/check-client-boundaries.mjs'],
          { STRICT_CLIENT_BOUNDARY_SCAN: '1' },
        ).passed,
      exitCode: null,
    },
    exportIsolation: command(root, node, ['scripts/security/check-csv-export-security.mjs']),
    structuredLogs: command(root, node, ['scripts/security/check-log-sanitization.mjs']),
    requestIds: command(root, vitest, [
      'run',
      'src/lib/observability/request-correlation.test.ts',
      'src/middleware.request-correlation.test.ts',
    ]),
    internalJobs: command(root, vitest, [
      'run',
      'src/app/api/internal/daily-maintenance/route.test.ts',
      'src/server/jobs/internal-batch-response.test.ts',
      'tests/security/internal-batch-results.test.ts',
    ]),
  };
}

function provenance({ repository, branch, targetSha, observedSha, runId, githubActions }) {
  const failures = [];
  if (!githubActions) failures.push('evidence must be generated by GitHub Actions');
  if (repository !== CANONICAL_REPOSITORY) failures.push('repository must be canonical');
  if (!String(branch ?? '').trim()) failures.push('branch must be present');
  if (!FULL_SHA.test(targetSha)) failures.push('targetSha must be a full Git SHA');
  if (observedSha !== targetSha) failures.push('checked-out SHA must equal targetSha');
  if (!/^\d+$/.test(String(runId))) failures.push('runId must be numeric');
  return { passed: failures.length === 0, failures };
}

function document({
  schema,
  evidenceItem,
  controlsVerified,
  checks,
  common,
  boundary,
  sourcePaths,
}) {
  const passed = checks.every((check) => check.passed === true)
    && common.provenance.passed
    && common.executionProven;

  return {
    schema,
    evidenceItem,
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    generatedAt: common.generatedAt,
    repository: common.repository,
    branch: common.branch,
    targetSha: common.targetSha,
    observedSha: common.observedSha,
    githubRunId: String(common.runId),
    checks,
    controlsVerified: passed ? controlsVerified : [],
    failures: common.provenance.failures,
    executionEvidence: common.executionEvidence,
    sourceDigests: Object.fromEntries(
      sourcePaths.map((path) => [path, common.sourceDigests[path]]),
    ),
    evidenceLocations: [...sourcePaths, DEFAULT_GITHUB_CHECKS],
    evidenceBoundary: boundary,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawCommandOutputStored: false,
      providerPayloadsStored: false,
      customerDataStored: false,
      exactShaBound: common.provenance.passed && common.exactChecks.exactSha,
    },
  };
}

export function buildEvidenceDocuments({
  sourceContracts,
  focusedValidation,
  exactChecks,
  repository,
  branch,
  targetSha,
  observedSha,
  runId,
  githubActions,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) {
  const proof = provenance({ repository, branch, targetSha, observedSha, runId, githubActions });
  const executionProven = exactChecks.evidenceComplete
    && exactChecks.exactSha
    && exactChecks.unitTests
    && exactChecks.securityCi
    && exactChecks.fullSecuritySuite
    && exactChecks.requiredChecks;
  const common = {
    repository,
    branch,
    targetSha,
    observedSha,
    runId,
    generatedAt,
    sourceDigests,
    provenance: proof,
    exactChecks,
    executionProven,
    executionEvidence: {
      exactShaChecksComplete: exactChecks.evidenceComplete,
      exactShaMatches: exactChecks.exactSha,
      unitTestsPassed: exactChecks.unitTests,
      securityCiPassed: exactChecks.securityCi,
      fullSecuritySuitePassed: exactChecks.fullSecuritySuite,
      requiredChecksPassed: exactChecks.requiredChecks,
      focusedValidation,
    },
  };

  const pass = (key) => sourceContracts[key] === true && focusedValidation[key]?.passed === true;

  return {
    originGuards: document({
      schema: 'risck-comply.origin-guard-validation.v1',
      evidenceItem: 'origin-guard-validation',
      controlsVerified: ['Origin guards validated'],
      checks: [{ name: 'originGuards', passed: pass('originGuards') }],
      common,
      boundary: 'Validates the repository origin/CSRF guard inventory and focused executable gate for the exact SHA. It does not replace production traffic or external penetration testing.',
      sourcePaths: ['package.json', '.github/workflows/full-security-suite.yml', 'scripts/security/check-origin-guards.mjs'],
    }),
    authorizationBola: document({
      schema: 'risck-comply.authorization-bola-validation.v1',
      evidenceItem: 'authorization-bola-validation',
      controlsVerified: ['BOLA and IDOR guards validated'],
      checks: [{ name: 'authorizationBola', passed: pass('authorizationBola') }],
      common,
      boundary: 'Validates organization-bound authorization and BOLA/IDOR repository gates for the exact SHA. Live tenant-isolation proof remains separately required.',
      sourcePaths: ['package.json', '.github/workflows/full-security-suite.yml', 'scripts/security/check-authorization-bola.mjs'],
    }),
    adminBoundary: document({
      schema: 'risck-comply.supabase-admin-boundary-validation.v1',
      evidenceItem: 'supabase-admin-boundary-validation',
      controlsVerified: ['Administrative clients remain server-only'],
      checks: [{ name: 'adminBoundary', passed: pass('adminBoundary') }],
      common,
      boundary: 'Validates source-level service-role and server-only import boundaries for the exact SHA. It does not prove live provider configuration or secret rotation.',
      sourcePaths: ['scripts/security/check-supabase-service-role-boundary.mjs', 'scripts/security/check-client-boundaries.mjs'],
    }),
    exportIsolation: document({
      schema: 'risck-comply.export-tenant-isolation-validation.v1',
      evidenceItem: 'export-tenant-isolation-validation',
      controlsVerified: ['Exports enforce tenant boundaries'],
      checks: [{ name: 'exportTenantIsolation', passed: pass('exportIsolation') }],
      common,
      boundary: 'Validates tenant-scoped export route contracts and executable repository gates for the exact SHA. It does not replace live cross-tenant runtime testing.',
      sourcePaths: ['package.json', '.github/workflows/full-security-suite.yml', 'scripts/security/check-csv-export-security.mjs'],
    }),
    structuredLogs: document({
      schema: 'risck-comply.centralized-logging-validation.v1',
      evidenceItem: 'centralized-logging-validation',
      controlsVerified: ['Structured logs validated'],
      checks: [{ name: 'structuredLogs', passed: pass('structuredLogs') }],
      common,
      boundary: 'Validates structured and sanitized logging contracts for the exact SHA. Live log ingestion and alert delivery remain separate provider controls.',
      sourcePaths: ['package.json', '.github/workflows/full-security-suite.yml', 'scripts/security/check-log-sanitization.mjs'],
    }),
    requestIds: document({
      schema: 'risck-comply.request-id-validation.v1',
      evidenceItem: 'request-id-validation',
      controlsVerified: ['Request IDs validated'],
      checks: [{ name: 'requestIds', passed: pass('requestIds') }],
      common,
      boundary: 'Validates trusted request-correlation generation and middleware propagation through focused tests for the exact SHA. It does not prove every downstream provider preserves the identifier.',
      sourcePaths: ['src/lib/observability/request-correlation.test.ts', 'src/middleware.request-correlation.test.ts'],
    }),
    internalJobs: document({
      schema: 'risck-comply.internal-jobs-validation.v1',
      evidenceItem: 'internal-jobs-validation',
      controlsVerified: ['Internal jobs fail closed', 'Batch partial failures are truthful'],
      checks: [
        { name: 'failClosed', passed: pass('internalJobs') },
        { name: 'partialFailureTruthful', passed: pass('internalJobs') },
      ],
      common,
      boundary: 'Validates production fail-closed internal job routing and truthful partial-result contracts through focused tests for the exact SHA. It does not prove a scheduler or provider executed in production.',
      sourcePaths: [
        'scripts/security/check-internal-maintenance-jobs.mjs',
        'src/server/jobs/internal-batch-response.test.ts',
        'tests/security/internal-batch-results.test.ts',
      ],
    }),
    vulnerabilityDisclosure: document({
      schema: 'risck-comply.vulnerability-disclosure-validation.v1',
      evidenceItem: 'vulnerability-disclosure-validation',
      controlsVerified: ['Vulnerability disclosure published'],
      checks: [{
        name: 'vulnerabilityDisclosure',
        passed: sourceContracts.vulnerabilityDisclosure === true
          && exactChecks.e2e
          && exactChecks.publicClaims,
      }],
      common,
      boundary: 'Validates that the public application tree includes a responsible vulnerability-disclosure route, qualified copy and a reporting channel on the exact SHA. It does not create a bug bounty or guarantee response times.',
      sourcePaths: ['src/lib/trust-center/content.ts', 'src/lib/trust-center/routes.ts', 'tests/e2e/route-health.spec.ts'],
    }),
  };
}

function head(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const sources = Object.fromEntries(
    SOURCE_PATHS.map((path) => [path, readFileSync(join(root, path), 'utf8')]),
  );
  const githubChecksPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH || DEFAULT_GITHUB_CHECKS;
  const githubChecksRaw = readFileSync(join(root, githubChecksPath), 'utf8');
  const githubChecks = JSON.parse(githubChecksRaw);
  const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
  const sourceContracts = evaluateSourceContracts(sources);
  const focusedValidation = runFocusedValidation(root);
  const exactChecks = evaluateExactShaChecks(githubChecks, targetSha);
  const documents = buildEvidenceDocuments({
    sourceContracts,
    focusedValidation,
    exactChecks,
    repository: process.env.GITHUB_REPOSITORY ?? '',
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
    targetSha,
    observedSha: head(root),
    runId: process.env.GITHUB_RUN_ID ?? '',
    githubActions: process.env.GITHUB_ACTIONS === 'true',
    sourceDigests: {
      ...Object.fromEntries(Object.entries(sources).map(([path, source]) => [path, digest(source)])),
      [DEFAULT_GITHUB_CHECKS]: digest(githubChecksRaw),
    },
  });

  let failed = false;
  for (const [key, relativePath] of Object.entries(OUTPUTS)) {
    const output = join(root, relativePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(documents[key], null, 2)}\n`);
    if (documents[key].status !== 'Complete') failed = true;
  }

  if (failed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) run();
