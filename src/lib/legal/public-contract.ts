export type PublicLegalPublicationState = 'review' | 'effective';

export const PUBLIC_TERMS_PUBLICATION = {
  documentId: 'terms-of-service',
  version: '0.3-review',
  state: 'review' as PublicLegalPublicationState,
  effectiveDate: null as string | null,
};

export const PUBLIC_PRIVACY_PUBLICATION = {
  documentId: 'privacy-policy',
  version: '0.2-review',
  state: 'review' as PublicLegalPublicationState,
  effectiveDate: null as string | null,
};

export const PUBLIC_TERMS_VERSION = PUBLIC_TERMS_PUBLICATION.version;
export const PUBLIC_PRIVACY_VERSION = PUBLIC_PRIVACY_PUBLICATION.version;
export const PUBLIC_CONTRACT_ACCEPTANCE_METHOD = 'checkout_clickwrap_v1';

export function isEffectivePublicLegalPublication(publication: {
  version: string;
  state: PublicLegalPublicationState;
  effectiveDate: string | null;
}) {
  return publication.state === 'effective'
    && Boolean(publication.effectiveDate)
    && publication.version.trim().length > 0;
}

export function isPublicSelfServeContractEffective() {
  return isEffectivePublicLegalPublication(PUBLIC_TERMS_PUBLICATION)
    && isEffectivePublicLegalPublication(PUBLIC_PRIVACY_PUBLICATION);
}
