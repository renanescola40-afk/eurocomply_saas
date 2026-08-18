export const INTERNAL_PATHNAME_HEADER = 'x-risck-internal-pathname';

export type CommercialRouteClass =
  | 'public'
  | 'auth_only'
  | 'billing_recovery'
  | 'privileged_control_plane'
  | 'licensed_product';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/register',
  '/auth',
  '/oauth/complete',
  '/pricing',
  '/enterprise',
  '/checkout',
  '/resources',
  '/faq',
  '/about',
  '/contact',
  '/book-demo',
  '/recuperar-senha',
  '/reset-password',
  '/atualizar-senha',
  '/trust',
  '/trust/procurement-pack',
  '/trust/security-questionnaire',
  '/security',
  '/compliance',
  '/data-processing',
  '/sla',
  '/privacy',
  '/terms',
  '/dpa',
  '/subprocessors',
  '/status',
  '/vulnerability-disclosure',
  '/politica-privacidade',
  '/termos-servico',
]);

const PUBLIC_PREFIXES = ['/features/', '/auth/', '/api/auth/'] as const;

const AUTH_ONLY_ROUTES = ['/onboarding', '/profile'] as const;
const AUTH_ONLY_PREFIXES = ['/invite/'] as const;

const PRIVILEGED_CONTROL_PLANE_ROUTES = ['/admin', '/platform'] as const;

const BILLING_RECOVERY_ROUTES = [
  '/billing',
  '/checkout/complete',
  '/dashboard/billing',
  '/dashboard/organizations/billing',
] as const;

function stripLocale(pathname: string, locale: string) {
  if (!pathname) return '';
  if (pathname === `/${locale}`) return '/';
  if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1) || '/';
  return pathname;
}

function matchesRouteOrDescendant(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export function classifyLocalizedCommercialRoute(pathname: string, locale: string): CommercialRouteClass {
  const path = stripLocale(pathname, locale);
  if (!path) return 'licensed_product';

  if (PUBLIC_ROUTES.has(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return 'public';
  }

  if (BILLING_RECOVERY_ROUTES.some((route) => matchesRouteOrDescendant(path, route))) {
    return 'billing_recovery';
  }

  if (
    AUTH_ONLY_ROUTES.some((route) => matchesRouteOrDescendant(path, route)) ||
    AUTH_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return 'auth_only';
  }

  if (PRIVILEGED_CONTROL_PLANE_ROUTES.some((route) => matchesRouteOrDescendant(path, route))) {
    return 'privileged_control_plane';
  }

  return 'licensed_product';
}

export function requiresCommercialLicense(pathname: string, locale: string) {
  return classifyLocalizedCommercialRoute(pathname, locale) === 'licensed_product';
}
