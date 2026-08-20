import { validateAuthRbacRuntimeEvidence } from '../release/validate-auth-rbac-runtime-evidence.mjs';
import { validateDeploymentRuntimeEvidence } from '../release/validate-deployment-runtime-evidence.mjs';
import { validateExternalSecurityReviewEvidence } from '../release/validate-external-security-review-evidence.mjs';
import { validateFinalValidationRuntimeEvidence } from '../release/validate-final-validation-runtime-evidence.mjs';
import { validateObservabilityRuntimeEvidence } from '../release/validate-observability-runtime-evidence.mjs';
import { validateProductionSecretsRuntimeEvidence } from '../release/validate-production-secrets-runtime-evidence.mjs';
import { validateRollbackRuntimeEvidence } from '../release/validate-rollback-runtime-evidence.mjs';
import { validateStepUpMfaRuntimeEvidence } from '../release/validate-step-up-mfa-runtime-evidence.mjs';
import { validateStripeRuntimeEvidence } from '../release/validate-stripe-runtime-evidence.mjs';
import { validateUploadScannerRuntimeEvidence } from '../release/validate-upload-scanner-runtime-evidence.mjs';
import { validateAuditChainLiveEvidence } from './validate-audit-chain-live-evidence.mjs';
import { validateBranchProtectionFreshness } from './validate-branch-protection-freshness.mjs';
import { validateRequiredStatusChecksRuntimeEvidence } from './validate-required-status-checks-runtime-evidence.mjs';
import { validateSupabaseRlsRuntimeEvidence as validateSupabaseProducerEvidence } from './check-supabase-rls-runtime-evidence.mjs';

const runtimeValidator = (validator) => (evidence, context = {}) => validator(evidence, {
  now: context.now,
  expectedBranch: context.expectedBranch,
  expectedRepository: context.expectedRepository,
  expectedCommitSha: context.expectedCommitSha,
});

const supabaseProducerValidator = (evidence, context = {}) => {
  const result = validateSupabaseProducerEvidence(evidence, {
    expectedSha: context.expectedCommitSha,
    repository: context.expectedRepository,
  });
  return result.failures;
};

export const p0EvidenceCatalog = Object.freeze([
  {
    item: 'Branch protection applied on `main`',
    aliases: ['Branch protection applied on main'],
    kind: 'runtime',
    file: 'branch-protection-required-checks.json',
    validator: runtimeValidator(validateBranchProtectionFreshness),
  },
  {
    item: 'Required status checks configured',
    kind: 'runtime',
    file: 'required-status-checks.json',
    validator: runtimeValidator(validateRequiredStatusChecksRuntimeEvidence),
  },
  {
    item: 'Production provider configuration evidence',
    aliases: ['Production secrets configured in provider secret stores'],
    kind: 'runtime',
    file: 'production-secrets-provider-stores.json',
    validator: runtimeValidator(validateProductionSecretsRuntimeEvidence),
  },
  {
    item: 'Auth/RBAC final runtime validation',
    kind: 'runtime',
    file: 'auth-rbac-final-validation.json',
    validator: runtimeValidator(validateAuthRbacRuntimeEvidence),
  },
  {
    item: 'Supabase live RLS validation completed',
    kind: 'runtime',
    file: 'supabase-live-rls-validation.json',
    validator: supabaseProducerValidator,
  },
  {
    item: 'External review',
    aliases: ['External security review or pentest completed'],
    kind: 'runtime',
    file: 'external-security-review-or-pentest.json',
    validator: runtimeValidator(validateExternalSecurityReviewEvidence),
    acceptedOutcomes: ['passed', 'passed_with_formal_acceptance'],
  },
  {
    item: 'Deterministic npm lockfile committed',
    kind: 'repository',
  },
  {
    item: 'Floating dependency specs removed',
    kind: 'repository',
  },
  {
    item: 'Deployment URL functional verification',
    kind: 'runtime',
    file: 'deployment-smoke-validation.json',
    validator: runtimeValidator(validateDeploymentRuntimeEvidence),
  },
  {
    item: 'Final validation runner',
    kind: 'runtime',
    file: 'final-validation-runner.json',
    validator: runtimeValidator(validateFinalValidationRuntimeEvidence),
    skipWhenFinalValidationInProgress: true,
  },
  {
    item: 'Audit-chain live validation',
    kind: 'runtime',
    file: 'audit-chain-live-validation.json',
    validator: runtimeValidator(validateAuditChainLiveEvidence),
  },
  {
    item: 'Upload malware/content scanning validation',
    kind: 'runtime',
    file: 'upload-malware-scan-validation.json',
    validator: runtimeValidator(validateUploadScannerRuntimeEvidence),
  },
  {
    item: 'Step-up MFA / IdP validation',
    kind: 'runtime',
    file: 'step-up-mfa-validation.json',
    validator: runtimeValidator(validateStepUpMfaRuntimeEvidence),
  },
  {
    item: 'Stripe billing runtime validation',
    kind: 'runtime',
    file: 'stripe-billing-validation.json',
    validator: runtimeValidator(validateStripeRuntimeEvidence),
  },
  {
    item: 'Observability readiness',
    aliases: ['Observability smoke validation'],
    kind: 'runtime',
    file: 'observability-smoke-validation.json',
    validator: runtimeValidator(validateObservabilityRuntimeEvidence),
  },
  {
    item: 'Rollback owner and rollback target',
    kind: 'runtime',
    file: 'rollback-dry-run-validation.json',
    validator: runtimeValidator(validateRollbackRuntimeEvidence),
  },
]);

export const p0RegisterRequiredItems = Object.freeze(
  p0EvidenceCatalog.map((entry) => entry.item),
);

export function activeP0RuntimeEvidenceItems({ finalValidationInProgress = false } = {}) {
  return p0EvidenceCatalog.filter((entry) => (
    entry.kind === 'runtime'
    && !(finalValidationInProgress && entry.skipWhenFinalValidationInProgress)
  ));
}
