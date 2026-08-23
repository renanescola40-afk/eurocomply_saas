import type { AnalyticsProperties } from './events';

const LOCALE_PREFIX = /^\/(?:en|pt|es|fr|it|de)(?=\/|$)/;
const SAFE_CTA_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

type CommercialCtaContext = {
  pageType: 'landing' | 'pricing' | 'feature' | 'trust' | 'resource' | 'enterprise' | 'demo';
  funnelStage: 'awareness' | 'consideration' | 'assurance' | 'commercial' | 'demand_capture';
};

type ResolveCommercialCtaInput = {
  pathname: string;
  href?: string | null;
  explicitId?: string | null;
};

function stripLocale(pathname: string) {
  return pathname.replace(LOCALE_PREFIX, '') || '/';
}

function normalizeRoute(pathname: string) {
  const stripped = stripLocale(pathname);
  return stripped.length > 1 ? stripped.replace(/\/$/, '') : stripped;
}

function normalizeHref(href: string | null | undefined) {
  if (!href) return null;

  try {
    const url = new URL(href, 'https://www.risckcomply.com');
    if (url.origin !== 'https://www.risckcomply.com') return null;
    return {
      route: normalizeRoute(url.pathname),
      hash: url.hash,
      plan: url.searchParams.get('plan')?.toLowerCase() || null,
    };
  } catch {
    return null;
  }
}

function normalizeExplicitId(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && SAFE_CTA_ID.test(normalized) ? normalized : null;
}

export function classifyCommercialCtaContext(pathname: string): CommercialCtaContext | null {
  const route = normalizeRoute(pathname);

  if (route === '/') return { pageType: 'landing', funnelStage: 'awareness' };
  if (route === '/pricing') return { pageType: 'pricing', funnelStage: 'commercial' };
  if (route === '/enterprise') return { pageType: 'enterprise', funnelStage: 'commercial' };
  if (route === '/book-demo') return { pageType: 'demo', funnelStage: 'demand_capture' };
  if (route.startsWith('/features/')) return { pageType: 'feature', funnelStage: 'consideration' };
  if (route === '/resources' || route.startsWith('/resources/')) return { pageType: 'resource', funnelStage: 'awareness' };
  if (
    route === '/trust'
    || route.startsWith('/trust/')
    || route === '/security'
    || route === '/compliance'
    || route === '/data-processing'
    || route === '/dpa'
    || route === '/subprocessors'
    || route === '/sla'
    || route === '/vulnerability-disclosure'
  ) {
    return { pageType: 'trust', funnelStage: 'assurance' };
  }

  return null;
}

export function resolveCommercialCtaId({ pathname, href, explicitId }: ResolveCommercialCtaInput) {
  const context = classifyCommercialCtaContext(pathname);
  if (!context) return null;

  const explicit = normalizeExplicitId(explicitId);
  if (explicit) return explicit;

  const currentRoute = normalizeRoute(pathname);
  const destination = normalizeHref(href);
  if (!destination) return null;

  if (currentRoute === '/') {
    if (destination.hash === '#platform') return 'home-explore-platform';
    if (destination.route === '/pricing') return 'home-pricing';
    if (destination.route === '/signup') return 'home-signup';
  }

  if (currentRoute === '/pricing') {
    if (destination.route === '/trust') return 'pricing-trust';
    if (destination.route === '/enterprise') return 'pricing-enterprise';
    if (destination.route === '/book-demo') {
      return destination.plan === 'business' ? 'pricing-plan-business' : 'pricing-book-demo';
    }
    if (destination.route === '/signup') {
      const plan = destination.plan;
      if (plan === 'essential' || plan === 'professional') return `pricing-plan-${plan}`;
      return 'pricing-signup';
    }
  }

  if (currentRoute === '/enterprise') {
    if (destination.route === '/book-demo') return 'enterprise-book-demo';
    if (destination.route === '/security-questionnaire') return 'enterprise-security-questionnaire';
    if (destination.route === '/pricing') return 'enterprise-pricing';
    if (destination.route === '/trust') return 'enterprise-trust';
  }

  if (currentRoute.startsWith('/features/')) {
    if (destination.route === '/signup') return 'feature-signup';
    if (destination.route === '/book-demo') return 'feature-book-demo';
    if (destination.route === '/pricing') return 'feature-pricing';
  }

  if (currentRoute === '/resources' || currentRoute.startsWith('/resources/')) {
    if (destination.route === '/signup') return 'resource-signup';
    if (destination.route === '/book-demo') return 'resource-book-demo';
  }

  if (context.pageType === 'trust') {
    if (destination.route === '/book-demo') return 'trust-book-demo';
    if (destination.route === '/enterprise') return 'trust-enterprise';
  }

  return null;
}

export function buildCommercialCtaProperties(pathname: string, ctaId: string): AnalyticsProperties {
  const context = classifyCommercialCtaContext(pathname);
  if (!context || !SAFE_CTA_ID.test(ctaId)) return {};

  return {
    path: pathname,
    page_type: context.pageType,
    funnel_stage: context.funnelStage,
    cta_id: ctaId,
    source: 'public_cta',
  };
}
