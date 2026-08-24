const RELEASE_SHA_PLACEHOLDER = '${RELEASE_SHA}';
const RECOVERY_CONFIRMATION_PLACEHOLDER = '${RECOVERY_ROLLBACK_CONFIRMATION}';
const SUPABASE_PROMOTION_RUN_ID_PLACEHOLDER = '${SUPABASE_PROMOTION_RUN_ID}';

export const RUNTIME_LANE_CONTRACTS = Object.freeze({
  'IAM-RBAC': Object.freeze({ workflow: 'auth-rbac-runtime-proof.yml', artifactPrefix: 'auth-rbac-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['auth-rbac-validation.json']), controlsVerified: Object.freeze(['IAM-01','IAM-02','IAM-03','IAM-04','IAM-05','IAM-06','TEN-01']) }),
  'IAM-LIFECYCLE': Object.freeze({ workflow: 'identity-access-lifecycle-proof.yml', artifactPrefix: 'identity-access-lifecycle-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_IDENTITY_LIFECYCLE_PROOF' }), requiredEvidenceFiles: Object.freeze(['identity-access-lifecycle-validation.json']), controlsVerified: Object.freeze(['IAM-07','IAM-09','IAM-10']) }),
  'IAM-SCIM': Object.freeze({ workflow: 'scim-runtime-proof.yml', artifactPrefix: 'scim-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_SCIM_RUNTIME_PROOF' }), requiredEvidenceFiles: Object.freeze(['scim-runtime-validation.json']), controlsVerified: Object.freeze(['IAM-09']) }),
  'IAM-SAML': Object.freeze({ workflow: 'saml-sso-runtime-proof.yml', artifactPrefix: 'saml-sso-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_SAML_SSO_RUNTIME_PROOF' }), requiredEvidenceFiles: Object.freeze(['saml-sso-runtime-validation.json']), controlsVerified: Object.freeze(['IAM-09']) }),
  'TEN-RLS': Object.freeze({ workflow: 'supabase-live-rls-validation.yml', artifactPrefix: 'supabase-live-rls-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, promotion_run_id: SUPABASE_PROMOTION_RUN_ID_PLACEHOLDER, confirmation: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF' }), requiredEvidenceFiles: Object.freeze(['supabase-live-rls-validation.json','supabase-rls-validation.json']), controlsVerified: Object.freeze(['TEN-02','TEN-03','TEN-04','TEN-05','TEN-06']) }),
  'FINAL-TECHNICAL': Object.freeze({ workflow: 'final-technical-controls-proof.yml', artifactPrefix: 'final-technical-controls-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_FINAL_TECHNICAL_PROOF' }), requiredEvidenceFiles: Object.freeze(['final-technical-controls-validation.json']), controlsVerified: Object.freeze(['TEN-10','OPS-03']) }),
  PLATFORM: Object.freeze({ workflow: 'platform-providers-runtime-proof.yml', artifactPrefix: 'platform-providers-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['platform-providers-validation.json']), controlsVerified: Object.freeze(['PLT-02','PLT-03','PLT-04','PLT-05','PLT-06','PLT-07','PLT-08','PLT-09','PLT-10','OPS-06']) }),
  DATA: Object.freeze({ workflow: 'data-governance-runtime-proof.yml', artifactPrefix: 'data-governance-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_DATA_GOVERNANCE_PROOF' }), requiredEvidenceFiles: Object.freeze(['data-governance-validation.json']), controlsVerified: Object.freeze(['TEN-09']) }),
  INCIDENT: Object.freeze({ workflow: 'incident-continuity-runtime-proof.yml', artifactPrefix: 'incident-continuity-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_INCIDENT_CONTINUITY_PROOF' }), requiredEvidenceFiles: Object.freeze(['incident-continuity-validation.json']), controlsVerified: Object.freeze(['OPS-09','OPS-10']) }),
  TRUST: Object.freeze({ workflow: 'procurement-trust-runtime-proof.yml', artifactPrefix: 'procurement-trust-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'EXECUTE_PROCUREMENT_TRUST_PROOF' }), requiredEvidenceFiles: Object.freeze(['procurement-trust-validation.json']), controlsVerified: Object.freeze(['TRU-01','TRU-07']) }),
  RECOVERY: Object.freeze({ workflow: 'recovery-resilience-proof.yml', artifactPrefix: 'recovery-resilience-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, exercise: 'full', confirmation: RECOVERY_CONFIRMATION_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['rollback-validation.json','backup-restore-tested.json']), controlsVerified: Object.freeze(['REC-01','REC-02','REC-03','REC-04','REC-05','REC-06','REC-07','REC-08','REC-09','REC-10']) }),
  PRODUCTION: Object.freeze({ workflow: 'production-runtime-proof.yml', artifactPrefix: 'production-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['deployment-smoke-validation.json','runtime-release-sha-validation.json','security-headers-validation.json','no-store-validation.json','production-runtime-validation.json']), controlsVerified: Object.freeze(['SEC-05','SEC-06','PLT-01','REL-01','REL-02','REL-03','REL-04','REL-05','REL-06']) }),
  REPOSITORY: Object.freeze({ workflow: 'branch-protection-runtime-proof.yml', artifactPrefix: 'branch-protection-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['branch-protection-main.generated.json']), controlsVerified: Object.freeze(['REL-08']) }),
  'STEP-UP': Object.freeze({ workflow: 'step-up-runtime-proof.yml', artifactPrefix: 'step-up-runtime-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER }), requiredEvidenceFiles: Object.freeze(['step-up-mfa-validation.json']), controlsVerified: Object.freeze(['IAM-08']) }),
  ASSURANCE: Object.freeze({ workflow: 'enterprise-final-assurance-proof.yml', artifactPrefix: 'enterprise-final-assurance-proof-', inputs: Object.freeze({ release_sha: RELEASE_SHA_PLACEHOLDER, confirmation: 'VALIDATE_FINAL_ASSURANCE' }), requiredEvidenceFiles: Object.freeze(['final-assurance-validation.json']), controlsVerified: Object.freeze(['SEC-10','REL-09','TRU-04','TRU-05','TRU-06','TRU-09']) }),
});

export const EXPECTED_RUNTIME_LANES = Object.freeze(Object.keys(RUNTIME_LANE_CONTRACTS));
export const ALLOWED_RUNTIME_WORKFLOWS = Object.freeze(new Set(Object.values(RUNTIME_LANE_CONTRACTS).map((contract) => contract.workflow)));
function fail(message) { throw new Error(message); }

export function resolveLaneInputs(inputs, { releaseSha, recoveryRollbackConfirmation, supabasePromotionRunId = '' }) {
  const resolved = {};
  const promotionRunId = String(supabasePromotionRunId || process.env.SUPABASE_PROMOTION_RUN_ID || '').trim();
  for (const [key, value] of Object.entries(inputs ?? {})) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) fail(`invalid workflow input key: ${key}`);
    if (value === RELEASE_SHA_PLACEHOLDER) resolved[key] = releaseSha;
    else if (value === RECOVERY_CONFIRMATION_PLACEHOLDER) resolved[key] = recoveryRollbackConfirmation;
    else if (value === SUPABASE_PROMOTION_RUN_ID_PLACEHOLDER) {
      if (!/^\d+$/.test(promotionRunId)) fail('SUPABASE_PROMOTION_RUN_ID must be a numeric successful governed Production promotion run ID');
      resolved[key] = promotionRunId;
    } else if (typeof value === 'string' || typeof value === 'boolean') resolved[key] = value;
    else fail(`unsupported workflow input value for ${key}`);
  }
  return resolved;
}

export function validateRuntimeCampaignManifest(manifest) {
  if (manifest?.schema_version !== 2) fail('runtime campaign manifest schema_version must be 2');
  if (!Array.isArray(manifest.workflows) || manifest.workflows.length !== EXPECTED_RUNTIME_LANES.length) fail('runtime campaign manifest must contain the complete lane contract');
  const seen = new Set();
  for (const lane of manifest.workflows) {
    if (!lane || typeof lane !== 'object' || Array.isArray(lane)) fail('runtime campaign lane must be an object');
    const contract = RUNTIME_LANE_CONTRACTS[lane.id];
    if (!contract || seen.has(lane.id)) fail(`invalid or duplicate runtime campaign lane: ${lane.id ?? 'missing'}`);
    seen.add(lane.id);
    if (lane.required !== true) fail(`runtime campaign lane ${lane.id} must be required`);
    if (lane.workflow !== contract.workflow) fail(`runtime campaign workflow drift for ${lane.id}`);
    if (lane.artifact_prefix !== contract.artifactPrefix) fail(`runtime campaign artifact prefix drift for ${lane.id}`);
    if (JSON.stringify(lane.inputs ?? {}) !== JSON.stringify(contract.inputs)) fail(`runtime campaign inputs drift for ${lane.id}`);
  }
  for (const lane of EXPECTED_RUNTIME_LANES) if (!seen.has(lane)) fail(`runtime campaign lane ${lane} is missing`);
  return true;
}
