export type PublicLegalPublicationState = 'review' | 'effective';

export type PublicLegalPublication = {
  documentId: 'terms-of-service' | 'privacy-policy';
  version: string;
  publicationState: PublicLegalPublicationState;
  effectiveDate: string | null;
};

export const PUBLIC_LEGAL_PUBLICATIONS = {
  terms: {
    documentId: 'terms-of-service',
    version: '0.3-review',
    publicationState: 'review',
    effectiveDate: null,
  },
  privacy: {
    documentId: 'privacy-policy',
    version: '0.2-review',
    publicationState: 'review',
    effectiveDate: null,
  },
} as const satisfies Record<'terms' | 'privacy', PublicLegalPublication>;

export const PUBLIC_TERMS_PUBLICATION = {
  ...PUBLIC_LEGAL_PUBLICATIONS.terms,
  state: PUBLIC_LEGAL_PUBLICATIONS.terms.publicationState,
} as const;

export const PUBLIC_PRIVACY_PUBLICATION = {
  ...PUBLIC_LEGAL_PUBLICATIONS.privacy,
  state: PUBLIC_LEGAL_PUBLICATIONS.privacy.publicationState,
} as const;

export const PUBLIC_TERMS_VERSION = PUBLIC_TERMS_PUBLICATION.version;
export const PUBLIC_PRIVACY_VERSION = PUBLIC_PRIVACY_PUBLICATION.version;
export const PUBLIC_CONTRACT_ACCEPTANCE_METHOD = 'checkout_clickwrap_v1';

const NON_EFFECTIVE_MARKERS = ['review', 'draft', 'pending'] as const;

export function isEffectivePublicLegalVersion(version: string) {
  const normalized = version.trim().toLowerCase();
  return normalized.length > 0 && NON_EFFECTIVE_MARKERS.every((marker) => !normalized.includes(marker));
}

function isEffectivePublication(publication: PublicLegalPublication) {
  return publication.publicationState === 'effective'
    && Boolean(publication.effectiveDate)
    && isEffectivePublicLegalVersion(publication.version);
}

export function isPublicSelfServeContractEffective() {
  return isEffectivePublication(PUBLIC_LEGAL_PUBLICATIONS.terms)
    && isEffectivePublication(PUBLIC_LEGAL_PUBLICATIONS.privacy);
}
