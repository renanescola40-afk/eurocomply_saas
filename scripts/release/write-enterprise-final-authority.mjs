#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;

export function buildEnterpriseFinalAuthority({ targetSha, closure, sourceManifest }) {
  const sourceComplete = sourceManifest?.status === 'Complete'
    && sourceManifest?.outcome === 'passed'
    && sourceManifest?.targetSha === targetSha
    && sourceManifest?.collectedProducerCount === sourceManifest?.requiredProducerCount
    && Array.isArray(sourceManifest?.missingProducerIds)
    && sourceManifest.missingProducerIds.length === 0;

  const closureComplete = closure?.decision === 'GO'
    && closure?.passed === true
    && closure?.expectedSha === targetSha
    && Array.isArray(closure?.blockers)
    && closure.blockers.length === 0
    && Number.isInteger(closure?.acceptedControls)
    && closure.acceptedControls === closure.totalControls;

  const passed = FULL_SHA.test(targetSha || '') && sourceComplete && closureComplete;
  const blockers = [
    ...(FULL_SHA.test(targetSha || '') ? [] : ['invalid_target_sha']),
    ...(sourceComplete ? [] : ['authoritative_domain_sources_incomplete']),
    ...(closureComplete ? [] : ['enterprise_100_closure_not_go']),
  ];

  return {
    schema: 'risck-comply.enterprise-final-authority.v1',
    generatedAt: new Date().toISOString(),
    releaseSha: targetSha,
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    decision: passed ? 'ENTERPRISE_100: PASS' : 'ENTERPRISE_100: NO_PASS_YET',
    productionDecision: passed ? 'PRODUCTION_GO: PASS' : 'PRODUCTION_GO: NO_GO',
    technicalReleaseClosure: passed ? 'TECHNICAL_RELEASE_CLOSURE: PASS' : 'TECHNICAL_RELEASE_CLOSURE: NO_PASS_YET',
    blockers,
    acceptedControls: closure?.acceptedControls ?? 0,
    totalControls: closure?.totalControls ?? 0,
    domainSources: sourceManifest?.producers ?? [],
    evidenceIntegrity: {
      exactCurrentMainRequired: true,
      exactShaArtifactsRequired: true,
      arbitraryRunIdsAccepted: false,
      firstJsonWinsAccepted: false,
      repositoryChecksAloneGrantEnterpriseGo: false,
      testModeBillingCanGrantLiveBillingPass: false,
      externalHumanEvidenceCanBeFabricated: false,
      containsSensitiveValues: false,
    },
    truthBoundary: passed
      ? 'Enterprise 100 and Production GO are granted only because every configured exact-SHA technical, live billing, live Supabase, Product QA, provider, legal and independent external-security control was accepted from an authorized producer.'
      : 'Enterprise 100 and Production GO remain withheld until every configured exact-SHA control and every authoritative domain producer is genuinely complete.',
  };
}

async function main() {
  const targetSha = String(process.env.TARGET_SHA || '').trim().toLowerCase();
  const closurePath = process.env.ENTERPRISE_100_CLOSURE_RESULT || 'release-validation/enterprise-100-closure.json';
  const sourcePath = process.env.FINAL_AUTHORITY_SOURCE_MANIFEST || 'artifacts/enterprise-final-authority-source/enterprise-final-authority-source.json';
  const outputPath = process.env.ENTERPRISE_FINAL_AUTHORITY_OUTPUT || 'release-validation/enterprise-final-authority.json';

  const [closure, sourceManifest] = await Promise.all([
    readFile(closurePath, 'utf8').then(JSON.parse),
    readFile(sourcePath, 'utf8').then(JSON.parse),
  ]);
  const result = buildEnterpriseFinalAuthority({ targetSha, closure, sourceManifest });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    decision: result.decision,
    productionDecision: result.productionDecision,
    releaseSha: result.releaseSha,
    blockers: result.blockers,
  }, null, 2));
  if (result.outcome !== 'passed') process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
