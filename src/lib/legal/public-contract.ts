export const PUBLIC_TERMS_VERSION = '0.3-review';
export const PUBLIC_PRIVACY_VERSION = '0.2-review';
export const PUBLIC_CONTRACT_ACCEPTANCE_METHOD = 'checkout_clickwrap_v1';

const NON_EFFECTIVE_MARKERS = ['review', 'draft', 'pending'] as const;

export function isEffectivePublicLegalVersion(version: string) {
  const normalized = version.trim().toLowerCase();
  return normalized.length > 0 && NON_EFFECTIVE_MARKERS.every((marker) => !normalized.includes(marker));
}

export function isPublicSelfServeContractEffective() {
  return isEffectivePublicLegalVersion(PUBLIC_TERMS_VERSION)
    && isEffectivePublicLegalVersion(PUBLIC_PRIVACY_VERSION);
}
