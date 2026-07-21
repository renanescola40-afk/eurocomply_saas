import { EXPECTED_RUNTIME_LANES } from './runtime-lane-contracts.mjs';

export const FULL_RUNTIME_PROFILE = 'full';
export const SAFE_RUNTIME_PROFILE = 'safe';
export const RUNTIME_CAMPAIGN_PROFILES = Object.freeze([FULL_RUNTIME_PROFILE, SAFE_RUNTIME_PROFILE]);
export const SAFE_RUNTIME_EXCLUDED_LANES = Object.freeze(['RECOVERY', 'ASSURANCE']);
export const SAFE_RUNTIME_LANES = Object.freeze(
  EXPECTED_RUNTIME_LANES.filter((lane) => !SAFE_RUNTIME_EXCLUDED_LANES.includes(lane)),
);

export function resolveRuntimeCampaignProfile(value = FULL_RUNTIME_PROFILE) {
  const normalized = String(value || FULL_RUNTIME_PROFILE).trim().toLowerCase();
  if (!RUNTIME_CAMPAIGN_PROFILES.includes(normalized)) {
    throw new Error(`Unsupported runtime campaign profile: ${normalized || 'missing'}`);
  }
  return normalized;
}

export function expectedLanesForProfile(profile) {
  const resolved = resolveRuntimeCampaignProfile(profile);
  return resolved === SAFE_RUNTIME_PROFILE ? SAFE_RUNTIME_LANES : EXPECTED_RUNTIME_LANES;
}

export function expectedDecisionForProfile(profile) {
  return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE
    ? 'READY_FOR_SAFE_PROMOTION'
    : 'READY_FOR_EVIDENCE_PROMOTION';
}

export function profileRequiresRecoveryConfirmation(profile) {
  return resolveRuntimeCampaignProfile(profile) === FULL_RUNTIME_PROFILE;
}

export function profileMayReuseExactShaRuns(profile) {
  return resolveRuntimeCampaignProfile(profile) === SAFE_RUNTIME_PROFILE;
}
