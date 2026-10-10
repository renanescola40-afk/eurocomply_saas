import { type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPage, type TrustPage } from './content';
import { TRUST_CENTER_ROUTES, type TrustCenterSlug } from './routes';

export type TrustCenterUiCopy = {
  trust: string;
  security: string;
  privacy: string;
  status: string;
  proofBadges: [string, string, string];
  lastUpdated: string;
  portal: string;
};

const ENGLISH_UI: TrustCenterUiCopy = {
  trust: 'Trust Center',
  security: 'Security',
  privacy: 'Privacy',
  status: 'Status',
  proofBadges: ['Security review', 'Procurement diligence', 'Evidence preparation'],
  lastUpdated: 'Last updated',
  portal: 'Trust portal',
};

export function getTrustCenterUi(_locale: Locale): TrustCenterUiCopy {
  return ENGLISH_UI;
}

export function getLocalizedTrustCenterPage(slug: TrustCenterSlug, _locale: Locale): TrustPage {
  return getTrustCenterPage(slug, 'en');
}

export function getLocalizedTrustCenterPages(_locale: Locale): TrustPage[] {
  return TRUST_CENTER_ROUTES.map((slug) => getTrustCenterPage(slug, 'en'));
}
