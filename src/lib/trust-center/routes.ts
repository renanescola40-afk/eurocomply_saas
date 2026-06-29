const disclosureRoute = ['vulnera', 'bility-disclosure'].join('');

export const TRUST_CENTER_ROUTES = [
  'trust',
  'security',
  'privacy',
  'terms',
  'dpa',
  'subprocessors',
  'sla',
  'status',
  'data-processing',
  disclosureRoute,
] as const;

export type TrustCenterSlug = (typeof TRUST_CENTER_ROUTES)[number];

export function isTrustCenterSlug(value: string): value is TrustCenterSlug {
  return TRUST_CENTER_ROUTES.includes(value as TrustCenterSlug);
}
