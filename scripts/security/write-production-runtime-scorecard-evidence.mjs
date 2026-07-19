#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_SMOKE = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const DEFAULT_SHA = 'docs/security/evidence/runtime/runtime-release-sha-validation.json';
const DEFAULT_OUTPUT = 'docs/security/evidence/runtime/production-runtime-validation.json';
const FULL_SHA = /^[a-f0-9]{40}$/;

function named(list, name) {
  return Array.isArray(list) ? list.find((item) => item?.name === name) : null;
}

function pass(name, passed, reason) {
  return passed ? { name, passed: true } : { name, status: 'NOT_VERIFIED', reason };
}

export function buildProductionRuntimeScorecardEvidence(smoke, shaEvidence, expectedSha, generatedAt = new Date().toISOString()) {
  const targetSha = String(expectedSha || '').toLowerCase();
  const targets = Array.isArray(smoke?.targets) ? smoke.targets : [];
  const target = targets.length === 1 ? targets[0] : null;
  const checks = target?.detailedChecks || [];
  const smokeTrusted = FULL_SHA.test(targetSha)
    && smoke?.evidenceItem === 'deployment-smoke-validation'
    && smoke?.status === 'Complete'
    && smoke?.outcome === 'passed'
    && Array.isArray(smoke?.failures)
    && smoke.failures.length === 0
    && smoke?.evidenceIntegrity?.containsSensitiveValues === false
    && smoke?.evidenceIntegrity?.valuesRedacted === true
    && named(smoke?.globalChecks, 'lastCommitValidated')?.details?.sha === targetSha
    && named(smoke?.globalChecks, 'buildShaRegistered')?.details?.sha === targetSha;
  const shaTrusted = shaEvidence?.schema === 'risck-comply.runtime-release-sha-validation.v1'
    && shaEvidence?.status === 'Complete'
    && shaEvidence?.outcome === 'passed'
    && shaEvidence?.expectedCommitSha === targetSha
    && shaEvidence?.expectedBuildSha === targetSha
    && shaEvidence?.observedCommitSha === targetSha
    && shaEvidence?.observedCommitShaMatchedExpected === true
    && Array.isArray(shaEvidence?.failures)
    && shaEvidence.failures.length === 0;
  const host = (() => { try { return new URL(target?.baseUrl).host.toLowerCase(); } catch { return null; } })();
  const hostTrusted = host === 'risckcomply.com' && shaEvidence?.targetHost === host;
  const trusted = smokeTrusted && shaTrusted && hostTrusted;
  const canonicalChecks = [
    pass('deploymentShaMatch', trusted, 'Exact production SHA binding proof unavailable.'),
    pass('productionHostname', trusted, 'Canonical production hostname proof unavailable.'),
    pass('health', trusted && named(checks, 'healthEndpointOk')?.passed === true, 'Production health endpoint proof unavailable.'),
    pass('readiness', trusted && named(checks, 'readyEndpointOkWithToken')?.passed === true && named(checks, 'readyEndpointDoesNotExposeSecrets')?.passed === true, 'Protected readiness proof unavailable.'),
    pass('deploymentSmoke', trusted && named(checks, 'publicLaunchPagesLoad')?.passed === true && named(checks, 'dashboardRequiresAuthentication')?.passed === true, 'Production deployment smoke proof unavailable.'),
  ];
  const allPassed = canonicalChecks.every((check) => check.passed === true);
  return {
    schema: 'risck-comply.production-runtime-scorecard-evidence.v1',
    evidenceItem: 'production-runtime-validation',
    status: allPassed ? 'Complete' : 'Open',
    outcome: allPassed ? 'passed' : 'not_verified',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    repository: 'renanescola40-afk/eurocomply_saas',
    branch: allPassed ? 'main' : null,
    targetSha: allPassed ? targetSha : null,
    targetHost: allPassed ? host : null,
    checks: canonicalChecks,
    failures: allPassed ? [] : canonicalChecks.filter((check) => check.passed !== true).map((check) => check.name),
    evidenceLocations: [DEFAULT_SMOKE, DEFAULT_SHA, 'scripts/release/run-deployment-smoke.mjs', 'scripts/release/verify-runtime-release-sha.mjs'],
    evidenceBoundary: 'This proves the exact main SHA served by the canonical production hostname plus focused health, readiness and anonymous smoke behavior. It does not prove authenticated tenant workflows, provider SLAs, rollback execution, DAST or external review.',
    evidenceIntegrity: { containsSensitiveValues: false, authorizationHeaderStored: false, cookiesStored: false, rawResponseBodiesStored: false, exactShaBound: allPassed },
  };
}

export function writeProductionRuntimeScorecardEvidence({
  smokePath = process.env.PRODUCTION_RUNTIME_SMOKE_PATH || DEFAULT_SMOKE,
  shaPath = process.env.PRODUCTION_RUNTIME_SHA_PATH || DEFAULT_SHA,
  outputPath = process.env.PRODUCTION_RUNTIME_SCORECARD_PATH || DEFAULT_OUTPUT,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || process.env.GITHUB_SHA || '',
} = {}) {
  const evidence = buildProductionRuntimeScorecardEvidence(JSON.parse(readFileSync(smokePath, 'utf8')), JSON.parse(readFileSync(shaPath, 'utf8')), expectedSha);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  if (evidence.outcome !== 'passed') throw new Error(`Production runtime evidence not verified: ${evidence.failures.join(', ')}`);
  console.log('Production runtime scorecard evidence: Complete/passed');
  return evidence;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) writeProductionRuntimeScorecardEvidence();
