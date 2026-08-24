import { EXPECTED_RUNTIME_LANES } from './runtime-lane-contracts.mjs';

export const FULL_RUNTIME_PROFILE = 'full';
export const SAFE_RUNTIME_PROFILE = 'safe';
export const RUNTIME_CAMPAIGN_PROFILES = Object.freeze([FULL_RUNTIME_PROFILE, SAFE_RUNTIME_PROFILE]);
// TEN-RLS is deliberately post-promotion. The automatic safe bootstrap runs
// before a governed Production promotion can exist, so it must not fabricate or
// require a promotion lineage. Full closeout restores TEN-RLS after promotion.
export const SAFE_RUNTIME_EXCLUDED_LANES = Object.freeze(['TEN-RLS', 'RECOVERY', 'ASSURANCE']);
export const SAFE_RUNTIME_LANES = Object.freeze(
  EXPECTED_RUNTIME_LANES.filter((lane) => !SAFE_RUNTIME_EXCLUDED_LANES.includes(lane)),
);
export const FULL_PROMOTION_DECISION = 'READY_FOR_EVIDENCE_PROMOTION';
export const SAFE_PROMOTION_DECISION = 'READY_FOR_SAFE_PROMOTION';
export const PARTIAL_SAFE_PROMOTION_DECISION = 'READY_FOR_PARTIAL_SAFE_PROMOTION';

export function resolveRuntimeCampaignProfile(value = FULL_RUNTIME_PROFILE) {
  const normalized = String(value || FULL_RUNTIME_PROFILE).trim().toLowerCase();
  if (!RUNTIME_CAMPAIGN_PROFILES.includes(normalized)) throw new Error(`Unsupported runtime campaign profile: ${normalized || 'missing'}`);
  return normalized;
}
export function expectedLanesForProfile(profile) {
  return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE ? SAFE_RUNTIME_LANES : EXPECTED_RUNTIME_LANES;
}
export function expectedDecisionForProfile(profile) {
  return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE ? SAFE_PROMOTION_DECISION : FULL_PROMOTION_DECISION;
}
export function allowedPromotionDecisionsForProfile(profile) {
  return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE
    ? Object.freeze([SAFE_PROMOTION_DECISION, PARTIAL_SAFE_PROMOTION_DECISION])
    : Object.freeze([FULL_PROMOTION_DECISION]);
}
export function decisionForCampaignResults(profile, results) {
  const resolved = resolveRuntimeCampaignProfile(profile);
  if (!Array.isArray(results)) throw new Error('Runtime campaign results must be an array');
  const complete = results.filter((result) => result?.status === 'complete').length;
  if (results.length > 0 && complete === results.length) return expectedDecisionForProfile(resolved);
  if (resolved === SAFE_RUNTIME_PROFILE && complete > 0) return PARTIAL_SAFE_PROMOTION_DECISION;
  return 'NO_GO';
}
export function profileAllowsIncrementalPromotion(profile) { return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE; }
export function profileRequiresRecoveryConfirmation(profile) { return resolveRuntimeCampaignProfile(profile) === FULL_RUNTIME_PROFILE; }
export function profileMayReuseExactShaRuns(profile) { return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE; }
