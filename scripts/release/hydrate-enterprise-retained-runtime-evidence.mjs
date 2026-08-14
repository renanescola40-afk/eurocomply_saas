#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAuditChainRuntimeEvidence } from '../enterprise/fetch-audit-chain-runtime-evidence.mjs';
import { fetchAuthRbacEvidence } from '../enterprise/fetch-auth-rbac-evidence.mjs';
import { fetchBranchProtectionRuntimeEvidence } from '../enterprise/fetch-branch-protection-runtime-evidence.mjs';
import { fetchProductionProviderRuntimeEvidence } from '../enterprise/fetch-production-provider-runtime-evidence.mjs';
import { fetchProductionRuntimeEvidence } from '../enterprise/fetch-production-runtime-evidence.mjs';
import { fetchPublicProductionFinalEvidence } from '../enterprise/fetch-public-production-final-evidence.mjs';
import { fetchStepUpRuntimeEvidence } from '../enterprise/fetch-step-up-runtime-evidence.mjs';
import { fetchStripePromotedRuntimeEvidence } from '../enterprise/fetch-stripe-promoted-runtime-evidence.mjs';
import { fetchSupabaseRlsEvidence } from '../enterprise/fetch-supabase-rls-evidence.mjs';
import { fetchUploadScannerRuntimeEvidence } from '../enterprise/fetch-upload-scanner-runtime-evidence.mjs';

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
    key: 'supabaseRls',
    workflowName: 'Supabase Live RLS Validation',
    workflowPath: '.github/workflows/supabase-live-rls-validation.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/supabase-live-rls-validation.json',
      'docs/security/evidence/runtime/supabase-rls-validation.json',
    ]),
  }),
  Object.freeze({
    key: 'uploadScanner',
    workflowName: 'RISCK COMPLY Upload Security CI',
    workflowPath: '.github/workflows/upload-security-ci.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/upload-malware-scan-validation.json',
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
    key: 'productionRuntime',
    workflowName: 'Production Runtime Proof',
    workflowPath: '.github/workflows/production-runtime-proof.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/deployment-smoke-validation.json',
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
  Object.freeze({
    key: 'publicProductionFinal',
    workflowName: 'Public Production Final',
    workflowPath: '.github/workflows/public-production-final.yml',
    evidencePaths: Object.freeze([
      'docs/security/evidence/runtime/final-validation-runner.json',
      'docs/security/evidence/runtime/observability-smoke-validation.json',
      'docs/security/evidence/runtime/rollback-dry-run-validation.json',
    ]),
  }),
]);

const DEFAULT_FETCHERS = Object.freeze({
  authRbac: fetchAuthRbacEvidence,
  supabaseRls: fetchSupabaseRlsEvidence,
  uploadScanner: fetchUploadScannerRuntimeEvidence,
  auditChain: fetchAuditChainRuntimeEvidence,
  productionRuntime: fetchProductionRuntimeEvidence,
  productionProvider: fetchProductionProviderRuntimeEvidence,
  branchProtection: fetchBranchProtectionRuntimeEvidence,
  stepUp: fetchStepUpRuntimeEvidence,
  stripePromoted: fetchStripePromotedRuntimeEvidence,
  publicProductionFinal: fetchPublicProductionFinalEvidence,
});

function normalize(value) {
  return String(value ?? '').trim();
}

function safeFailureCode(error) {
  const raw = error instanceof Error ? error.message : String(error ?? 'unknown_error');
  const code = raw.split(':')[0].trim();
  return /^[A-Za-z0-9_.-]+$/.test(code) ? code : 'producer_evidence_invalid';
}

async function clearEvidencePaths(root, paths) {
  await Promise.all(paths.map((relativePath) => rm(join(root, relativePath), { force: true })));
}

async function clearRepositorySnapshots(root) {
  const paths = [...new Set(RETAINED_RUNTIME_PRODUCERS.flatMap((producer) => producer.evidencePaths))];
  await clearEvidencePaths(root, paths);
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
  optionalProducerErrorsAsMissing = false,
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
    let result;

    try {
      result = await fetcher({
        root,
        repository,
        token,
        targetSha: normalizedTargetSha,
        sourceRunId: isTriggerSource ? normalizedSourceRunId : '',
        required: isTriggerSource,
      });
    } catch (error) {
      await clearEvidencePaths(root, producer.evidencePaths);
      if (isTriggerSource || !optionalProducerErrorsAsMissing) throw error;
      results.push({
        key: producer.key,
        workflowName: producer.workflowName,
        workflowPath: producer.workflowPath,
        evidencePaths: [...producer.evidencePaths],
        triggerSource: false,
        found: false,
        sourceRunId: null,
        artifactId: null,
        reason: `producer_validation_error:${safeFailureCode(error)}`,
      });
      continue;
    }

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
    producerValidationErrorCount: results.filter((result) => String(result.reason || '').startsWith('producer_validation_error:')).length,
    optionalProducerErrorsAsMissing: Boolean(optionalProducerErrorsAsMissing),
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
      optionalProducerErrorsCanBeReportedAsMissingOnlyInDiagnosticMode: true,
    },
    truthBoundary: optionalProducerErrorsAsMissing
      ? 'Diagnostic mode restores only evidence independently validated for the exact target SHA. Invalid optional producer artifacts are cleared and reported as missing rather than aborting the diagnostic report; they receive no PASS credit. Trigger-bound producers remain fail-closed. This mode must not be used to weaken a release gate.'
      : 'This fan-in only restores evidence that each dedicated producer fetcher independently validates for the exact target SHA and approved workflow provenance. Workflow-run trigger authorization uses an allowlisted stable workflow path rather than a mutable run-name. Missing proofs remain missing, failed producer runs are not converted into successful evidence, repository snapshots are cleared before retrieval, and downstream release validators remain authoritative for PASS/GO decisions.',
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
    optionalProducerErrorsAsMissing: process.env.RETAINED_PROOF_OPTIONAL_ERRORS_AS_MISSING === 'true',
  });
  console.log(JSON.stringify({
    targetSha: manifest.targetSha,
    hydratedProducerCount: manifest.hydratedProducerCount,
    missingProducerCount: manifest.missingProducerCount,
    producerValidationErrorCount: manifest.producerValidationErrorCount,
    optionalProducerErrorsAsMissing: manifest.optionalProducerErrorsAsMissing,
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
