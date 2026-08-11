#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAuditChainRuntimeEvidence } from '../enterprise/fetch-audit-chain-runtime-evidence.mjs';
import { fetchAuthRbacEvidence } from '../enterprise/fetch-auth-rbac-evidence.mjs';
import { fetchBranchProtectionRuntimeEvidence } from '../enterprise/fetch-branch-protection-runtime-evidence.mjs';
import { fetchProductionProviderRuntimeEvidence } from '../enterprise/fetch-production-provider-runtime-evidence.mjs';
import { fetchStepUpRuntimeEvidence } from '../enterprise/fetch-step-up-runtime-evidence.mjs';
import { fetchStripePromotedRuntimeEvidence } from '../enterprise/fetch-stripe-promoted-runtime-evidence.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const NUMERIC_ID = /^\d+$/;
const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const MANIFEST_PATH = 'release-validation/retained-runtime-evidence-hydration.json';

export const RETAINED_RUNTIME_PRODUCERS = Object.freeze([
  Object.freeze({
    key: 'authRbac',
    workflowName: 'Auth RBAC Tenant Proof',
    workflowPath: '.github/workflows/auth-rbac-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/auth-rbac-final-validation.json',
      'docs/security/evidence/runtime/auth-rbac-validation.json',
    ]),
  }),
  Object.freeze({
    key: 'auditChain',
    workflowName: 'Audit Chain Runtime Proof',
    workflowPath: '.github/workflows/audit-chain-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/audit-chain-live-validation.json',
    ]),
  }),
  Object.freeze({
    key: 'productionProvider',
    workflowName: 'Production Provider Runtime Proof',
    workflowPath: '.github/workflows/production-provider-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/production-secrets-provider-stores.json',
    ]),
  }),
  Object.freeze({
    key: 'branchProtection',
    workflowName: 'Branch Protection Runtime Proof',
    workflowPath: '.github/workflows/branch-protection-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/branch-protection-validation.json',
      'docs/security/evidence/runtime/branch-protection-required-checks.json',
    ]),
  }),
  Object.freeze({
    key: 'stepUp',
    workflowName: 'Step-Up Runtime Proof',
    workflowPath: '.github/workflows/step-up-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/step-up-mfa-validation.json',
    ]),
  }),
  Object.freeze({
    key: 'stripePromoted',
    workflowName: 'Stripe Runtime Evidence Promotion',
    workflowPath: '.github/workflows/stripe-runtime-evidence-promotion.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/stripe-billing-validation.json',
    ]),
  }),
]);

const DEFAULT_FETCHERS = Object.freeze({
  authRbac: fetchAuthRbacEvidence,
  auditChain: fetchAuditChainRuntimeEvidence,
  productionProvider: fetchProductionProviderRuntimeEvidence,
  branchProtection: fetchBranchProtectionRuntimeEvidence,
  stepUp: fetchStepUpRuntimeEvidence,
  stripePromoted: fetchStripePromotedRuntimeEvidence,
});

function normalize(value) {
  return String(value ?? '').trim();
}

async function clearRepositorySnapshots(root) {
  const paths = [...new Set(RETAINED_RUNTIME_PRODUCERS.flatMap((producer) => producer.evidencePaths))];
  await Promise.all(paths.map((relativePath) => rm(join(root, relativePath), { force: true })));
  return paths;
}

export async function hydrateEnterpriseRetainedRuntimeEvidence({
  root,
  repository,
  token,
  targetSha,
  sourceWorkflowName = '',
  sourceWorkflowPath = '',
  sourceRunId = '',
  fetchers = DEFAULT_FETCHERS,
}) {
  const normalizedTargetSha = normalize(targetSha).toLowerCase();
  const normalizedSourceWorkflow = normalize(sourceWorkflowName);
  const normalizedSourceWorkflowPath = normalize(sourceWorkflowPath);
  const normalizedSourceRunId = normalize(sourceRunId);

  if (repository !== CANONICAL_REPOSITORY) throw new Error('repository_not_canonical');
  if (!token) throw new Error('github_token_missing');
  if (!FULL_SHA.test(normalizedTargetSha)) throw new Error('target_sha_invalid');

  const triggeredProducerByPath = normalizedSourceWorkflowPath
    ? RETAINED_RUNTIME_PRODUCERS.find((producer) => producer.workflowPath === normalizedSourceWorkflowPath)
    : null;
  if (normalizedSourceWorkflowPath && !triggeredProducerByPath) throw new Error('source_workflow_path_not_allowlisted');

  const triggeredProducerByLegacyName = !normalizedSourceWorkflowPath && normalizedSourceWorkflow
    ? RETAINED_RUNTIME_PRODUCERS.find((producer) => producer.workflowName === normalizedSourceWorkflow)
    : null;
  if (!normalizedSourceWorkflowPath && normalizedSourceWorkflow && !triggeredProducerByLegacyName) {
    throw new Error('source_workflow_not_allowlisted');
  }

  const triggeredProducer = triggeredProducerByPath || triggeredProducerByLegacyName;
  if (triggeredProducer && !NUMERIC_ID.test(normalizedSourceRunId)) throw new Error('source_run_id_invalid');
  if (!triggeredProducer && normalizedSourceRunId) throw new Error('source_run_without_workflow');

  const clearedPaths = await clearRepositorySnapshots(root);
  const results = [];

  for (const producer of RETAINED_RUNTIME_PRODUCERS) {
    const fetcher = fetchers?.[producer.key];
    if (typeof fetcher !== 'function') throw new Error(`fetcher_missing_${producer.key}`);
    const isTriggerSource = triggeredProducer?.key === producer.key;
    const result = await fetcher({
      root,
      repository,
      token,
      targetSha: normalizedTargetSha,
      sourceRunId: isTriggerSource ? normalizedSourceRunId : '',
      required: isTriggerSource,
    });
    results.push({
      key: producer.key,
      workflowName: producer.workflowName,
      workflowPath: producer.workflowPath,
      evidencePaths: [...producer.evidencePaths],
      triggerSource: isTriggerSource,
      found: result?.found === true,
      sourceRunId: result?.found === true ? String(result.runId ?? '') || null : null,
      artifactId: result?.found === true ? String(result.artifactId ?? '') || null : null,
      reason: result?.found === true ? null : String(result?.reason ?? 'exact_sha_successful_proof_not_available'),
    });
  }

  const generatedAt = new Date().toISOString();
  const manifest = {
    schema: 'risck-comply.enterprise-retained-runtime-evidence-hydration.v1',
    status: 'Complete',
    generatedAt,
    repository,
    targetSha: normalizedTargetSha,
    sourceWorkflowName: normalizedSourceWorkflow || null,
    sourceWorkflowPath: normalizedSourceWorkflowPath || triggeredProducer?.workflowPath || null,
    sourceRunId: normalizedSourceRunId || null,
    producerCount: RETAINED_RUNTIME_PRODUCERS.length,
    hydratedProducerCount: results.filter((result) => result.found).length,
    missingProducerCount: results.filter((result) => !result.found).length,
    clearedRepositorySnapshotPaths: clearedPaths,
    producers: results,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaRequired: true,
      successfulProducerRunRequiredForPromotion: true,
      triggeringProducerArtifactRequiredWhenTriggered: Boolean(triggeredProducer),
      repositorySnapshotsClearedBeforeHydration: true,
      statusPromotionPerformedByHydrator: false,
      triggerAuthorizationUsesStableWorkflowPath: Boolean(normalizedSourceWorkflowPath),
    },
    truthBoundary: 'This fan-in only restores evidence that each dedicated producer fetcher independently validates for the exact target SHA and approved workflow provenance. Workflow-run trigger authorization uses an allowlisted stable workflow path rather than a mutable run-name. Missing proofs remain missing, failed producer runs are not converted into successful evidence, repository snapshots are cleared before retrieval, and downstream release validators remain authoritative for PASS/GO decisions.',
  };

  const manifestPath = join(root, MANIFEST_PATH);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  return manifest;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const manifest = await hydrateEnterpriseRetainedRuntimeEvidence({
    root,
    repository: process.env.GITHUB_REPOSITORY || '',
    token: process.env.GITHUB_TOKEN || '',
    targetSha: process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
    sourceWorkflowName: process.env.RETAINED_PROOF_SOURCE_WORKFLOW || '',
    sourceWorkflowPath: process.env.RETAINED_PROOF_SOURCE_WORKFLOW_PATH || '',
    sourceRunId: process.env.RETAINED_PROOF_SOURCE_RUN_ID || '',
  });
  console.log(JSON.stringify({
    targetSha: manifest.targetSha,
    hydratedProducerCount: manifest.hydratedProducerCount,
    missingProducerCount: manifest.missingProducerCount,
    sourceWorkflowName: manifest.sourceWorkflowName,
    sourceWorkflowPath: manifest.sourceWorkflowPath,
  }, null, 2));
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Enterprise retained runtime evidence hydration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
