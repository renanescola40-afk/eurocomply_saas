#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;

export function buildEnterpriseFinalAuthority({ targetSha, closure, sourceManifest }) {
  const exactSha = FULL_SHA.test(targetSha || '');

  const sourceStrictComplete = sourceManifest?.status === 'Complete'
    && sourceManifest?.outcome === 'passed'
    && sourceManifest?.targetSha === targetSha
    && sourceManifest?.collectedProducerCount === sourceManifest?.requiredProducerCount
    && Array.isArray(sourceManifest?.missingProducerIds)
    && sourceManifest.missingProducerIds.length === 0;

  const sourceInternalComplete = sourceManifest?.internalStatus
    ? sourceManifest.internalStatus === 'Complete'
      && sourceManifest?.internalOutcome === 'passed'
      && sourceManifest?.targetSha === targetSha
      && sourceManifest?.internalCollectedProducerCount === sourceManifest?.internalRequiredProducerCount
      && Array.isArray(sourceManifest?.internalMissingProducerIds)
      && sourceManifest.internalMissingProducerIds.length === 0
    : sourceStrictComplete;

  const closureStrictComplete = closure?.decision === 'GO'
    && closure?.passed === true
    && closure?.expectedSha === targetSha
    && Array.isArray(closure?.blockers)
    && closure.blockers.length === 0
    && Number.isInteger(closure?.acceptedControls)
    && closure.acceptedControls === closure.totalControls;

  const closureInternalComplete = Object.hasOwn(closure || {}, 'internalPassed')
    ? closure?.internalDecision === 'GO'
      && closure?.internalPassed === true
      && closure?.expectedSha === targetSha
      && Array.isArray(closure?.internalBlockers)
      && closure.internalBlockers.length === 0
      && Number.isInteger(closure?.internalAcceptedControls)
      && closure.internalAcceptedControls === closure.internalTotalControls
    : closureStrictComplete;

  const internalPassed = exactSha && sourceInternalComplete && closureInternalComplete;
  const strictPassed = internalPassed && sourceStrictComplete && closureStrictComplete;

  const internalBlockers = [
    ...(exactSha ? [] : ['invalid_target_sha']),
    ...(sourceInternalComplete ? [] : ['internal_domain_sources_incomplete']),
    ...(closureInternalComplete ? [] : ['internal_enterprise_closure_not_go']),
  ];
  const strictBlockers = [
    ...internalBlockers,
    ...(sourceStrictComplete ? [] : ['strict_domain_sources_incomplete']),
    ...(closureStrictComplete ? [] : ['strict_enterprise_closure_not_go']),
  ];

  return {
    schema: 'risck-comply.enterprise-final-authority.v2',
    generatedAt: new Date().toISOString(),
    releaseSha: targetSha,
    status: internalPassed ? 'Complete' : 'Open',
    outcome: internalPassed ? 'passed' : 'blocked',
    decision: internalPassed ? 'ENTERPRISE_PRODUCT_READY: PASS' : 'ENTERPRISE_PRODUCT_READY: NO_PASS_YET',
    enterpriseStrictDecision: strictPassed
      ? 'ENTERPRISE_STRICT: PASS'
      : internalPassed
        ? 'ENTERPRISE_STRICT: WAITING_EXTERNAL'
        : 'ENTERPRISE_STRICT: NO_PASS_YET',
    productionDecision: internalPassed ? 'PRODUCTION_GO: PASS' : 'PRODUCTION_GO: NO_GO',
    technicalReleaseClosure: internalPassed ? 'TECHNICAL_RELEASE_CLOSURE: PASS' : 'TECHNICAL_RELEASE_CLOSURE: NO_PASS_YET',
    internalPassed,
    strictPassed,
    blockers: internalBlockers,
    strictBlockers,
    acceptedControls: closure?.acceptedControls ?? 0,
    totalControls: closure?.totalControls ?? 0,
    internalAcceptedControls: closure?.internalAcceptedControls ?? closure?.acceptedControls ?? 0,
    internalTotalControls: closure?.internalTotalControls ?? closure?.totalControls ?? 0,
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
    truthBoundary: strictPassed
      ? 'Internal Product Ready, Production GO and strict Enterprise assurance are granted because all exact-SHA internal controls and selected external assurance controls are genuinely complete.'
      : internalPassed
        ? 'Internal Product Ready and Production GO are granted from complete exact-SHA internal evidence. Strict Enterprise assurance remains WAITING_EXTERNAL and no missing independent external evidence is fabricated or converted into engineering work.'
        : 'Internal Product Ready and Production GO remain withheld until every internally controllable exact-SHA control and internal authoritative producer is genuinely complete.',
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
    strictBlockers: result.strictBlockers,
    enterpriseStrictDecision: result.enterpriseStrictDecision,
  }, null, 2));
  if (result.outcome !== 'passed') process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
