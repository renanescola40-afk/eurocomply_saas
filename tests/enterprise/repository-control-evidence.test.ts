import { describe, expect, it } from 'vitest';

import {
  buildEvidenceDocuments,
  evaluateExactShaChecks,
  evaluateSourceContracts,
} from '../../scripts/enterprise/build-repository-control-evidence.mjs';

const SHA = 'a'.repeat(40);

const sources = {
  'package.json': JSON.stringify({ scripts: {
    'security:origin-guards': 'node scripts/security/check-origin-guards.mjs',
    'security:authorization-bola': 'node scripts/security/check-authorization-bola.mjs',
    'security:csv-exports': 'node scripts/security/check-csv-export-security.mjs',
    'security:logs': 'node scripts/security/check-log-sanitization.mjs',
  } }),
  '.github/workflows/full-security-suite.yml': 'run: npm run security:ci',
  'scripts/security/check-origin-guards.mjs': 'origin guard',
  'scripts/security/check-authorization-bola.mjs': 'bola',
  'scripts/security/check-supabase-service-role-boundary.mjs': 'NEXT_PUBLIC_ service role boundary process.exitCode = 1',
  'scripts/security/check-client-boundaries.mjs': "serverOnlyImportPatterns '@/lib/supabase/admin' STRICT_CLIENT_BOUNDARY_SCAN",
  'scripts/security/check-csv-export-security.mjs': 'csv',
  'scripts/security/check-log-sanitization.mjs': 'logs',
  'scripts/security/check-internal-maintenance-jobs.mjs': 'fail closed in production noStoreJson process.exitCode = 1',
  'src/lib/observability/request-correlation.test.ts': 'request correlation',
  'src/middleware.request-correlation.test.ts': 'request id',
  'src/server/jobs/internal-batch-response.test.ts': 'partial failed',
  'tests/security/internal-batch-results.test.ts': 'partial failed',
  'src/lib/trust-center/content.ts': 'Vulnerability Disclosure Responsible disclosure channel active Reporting contact',
  'src/lib/trust-center/routes.ts': "['vulnera', 'bility-disclosure'].join('') TRUST_CENTER_ROUTES",
  'tests/e2e/route-health.spec.ts': 'vulnerability-disclosure',
};

function exactChecks(overrides = {}) {
  return {
    evidenceComplete: true,
    exactSha: true,
    unitTests: true,
    e2e: true,
    publicClaims: true,
    securityCi: true,
    fullSecuritySuite: true,
    requiredChecks: true,
    ...overrides,
  };
}

function focused(passed = true) {
  return Object.fromEntries(
    ['originGuards', 'authorizationBola', 'adminBoundary', 'exportIsolation', 'structuredLogs', 'requestIds', 'internalJobs']
      .map((name) => [name, { passed, exitCode: passed ? 0 : 1 }]),
  );
}

function build(overrides = {}) {
  const sourceContracts = evaluateSourceContracts(sources);
  return buildEvidenceDocuments({
    sourceContracts,
    focusedValidation: focused(),
    exactChecks: exactChecks(),
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: 'feature/evidence',
    targetSha: SHA,
    observedSha: SHA,
    runId: '123',
    githubActions: true,
    sourceDigests: Object.fromEntries(Object.keys(sources).map((path) => [path, 'b'.repeat(64)])),
    generatedAt: '2026-07-16T00:00:00.000Z',
    ...overrides,
  });
}

describe('repository enterprise control evidence', () => {
  it('requires the expected executable and public-source contracts', () => {
    expect(evaluateSourceContracts(sources)).toEqual({
      originGuards: true,
      authorizationBola: true,
      adminBoundary: true,
      exportIsolation: true,
      structuredLogs: true,
      requestIds: true,
      internalJobs: true,
      vulnerabilityDisclosure: true,
    });
  });

  it('requires exact-SHA GitHub checks', () => {
    const evaluated = evaluateExactShaChecks({
      status: 'Complete',
      outcome: 'passed',
      targetSha: SHA,
      checks: [
        'unitTests', 'e2e', 'publicClaims', 'securityCi', 'fullSecuritySuite', 'requiredChecks',
      ].map((name) => ({ name, status: 'PASS' })),
    }, SHA);

    expect(Object.values(evaluated).every(Boolean)).toBe(true);
  });

  it('builds complete exact-SHA evidence without storing command output or sensitive values', () => {
    const documents = build();

    expect(Object.keys(documents)).toHaveLength(8);
    expect(Object.values(documents).every((document) => document.status === 'Complete')).toBe(true);
    expect(documents.internalJobs.checks).toEqual([
      { name: 'failClosed', passed: true },
      { name: 'partialFailureTruthful', passed: true },
    ]);

    for (const document of Object.values(documents)) {
      expect(document.targetSha).toBe(SHA);
      expect(document.observedSha).toBe(SHA);
      expect(document.evidenceIntegrity.containsSensitiveValues).toBe(false);
      expect(document.evidenceIntegrity.rawCommandOutputStored).toBe(false);
      expect(document.evidenceIntegrity.exactShaBound).toBe(true);
    }
  });

  it('fails closed on a focused validation failure', () => {
    const documents = build({ focusedValidation: focused(false) });

    expect(documents.originGuards.status).toBe('Open');
    expect(documents.authorizationBola.status).toBe('Open');
    expect(documents.requestIds.status).toBe('Open');
    expect(documents.internalJobs.status).toBe('Open');
  });

  it('fails closed on missing exact-SHA aggregate evidence', () => {
    const documents = build({ exactChecks: exactChecks({ requiredChecks: false }) });

    expect(Object.values(documents).every((document) => document.status === 'Open')).toBe(true);
  });

  it('does not promote vulnerability disclosure without E2E and public-claims proof', () => {
    const documents = build({ exactChecks: exactChecks({ e2e: false }) });

    expect(documents.vulnerabilityDisclosure.status).toBe('Open');
  });
});
