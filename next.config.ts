import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
const isProduction = process.env.NODE_ENV === 'production';

const DEFAULT_IMAGE_REMOTE_HOSTS = [
  'images.unsplash.com',
  'avatars.githubusercontent.com',
  'lh3.googleusercontent.com',
  'flagcdn.com',
] as const;

const POSTHOG_SCRIPT_HOSTS = ['https://eu-assets.i.posthog.com'] as const;
const POSTHOG_CONNECT_HOSTS = ['https://eu.i.posthog.com', 'https://eu-assets.i.posthog.com'] as const;

function normalizeTrustedImageHostname(value: string) {
  const candidate = value.trim().toLowerCase();
  if (!candidate || candidate.includes('*')) return null;

  try {
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return new URL(candidate).hostname;
    }
  } catch {
    return null;
  }

  if (!/^[a-z0-9.-]+$/.test(candidate)) return null;
  return candidate;
}

function getSupabaseImageHost() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    return [new URL(supabaseUrl).hostname];
  } catch {
    return [];
  }
}

function getConfiguredHttpsOrigin(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

function getNonProductionLoopbackSupabaseOrigin() {
  if (isProduction) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;

  try {
    const parsed = new URL(supabaseUrl);
    const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);
    if (!loopbackHosts.has(parsed.hostname)) return null;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getTrustedImageHostnames() {
  const configuredHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS ?? '')
    .split(',')
    .map((host) => normalizeTrustedImageHostname(host))
    .filter((host): host is string => Boolean(host));

  return Array.from(new Set([...DEFAULT_IMAGE_REMOTE_HOSTS, ...getSupabaseImageHost(), ...configuredHosts]));
}

const trustedImageHostnames = getTrustedImageHostnames();
const imageSrcPolicy = ["img-src 'self' data: blob:", ...trustedImageHostnames.map((hostname) => `https://${hostname}`)].join(' ');
const posthogScriptSrcPolicy = POSTHOG_SCRIPT_HOSTS.join(' ');
const posthogConnectSrcPolicy = POSTHOG_CONNECT_HOSTS.join(' ');
const supabaseConnectOrigin = getConfiguredHttpsOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const sentryConnectOrigin = getConfiguredHttpsOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);
const nonProductionLoopbackSupabaseOrigin = getNonProductionLoopbackSupabaseOrigin();
const connectSrcPolicy = [
  "connect-src 'self'",
  supabaseConnectOrigin,
  nonProductionLoopbackSupabaseOrigin,
  'https://api.stripe.com',
  'https://checkout.stripe.com',
  sentryConnectOrigin,
  'https://vitals.vercel-insights.com',
  posthogConnectSrcPolicy,
].filter((value): value is string => Boolean(value)).join(' ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isProduction
        ? `script-src 'self' 'unsafe-inline' https://js.stripe.com ${posthogScriptSrcPolicy}`
        : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com ${posthogScriptSrcPolicy}`,
      "style-src 'self' 'unsafe-inline'",
      imageSrcPolicy,
      "media-src 'self' data: blob:",
      "font-src 'self' data:",
      connectSrcPolicy,
      "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'none'",
      isProduction ? 'upgrade-insecure-requests' : '',
    ].filter(Boolean).join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()' },
];

const noIndexHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
] as const;

const publicCacheHeaders = [
  {
    key: 'Cache-Control',
    value: 'public, s-maxage=300, stale-while-revalidate=3600',
  },
] as const;

const provisionalLocaleNoIndexHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, follow, noarchive' },
  ...publicCacheHeaders,
] as const;

// Locale-prefixed URLs are the canonical public acquisition surface. These
// fixed-slug aliases are legacy/discovery entry points only and must converge
// permanently on English instead of using the middleware's temporary,
// country-adaptive redirect. Auth/private routes intentionally stay outside
// this list and keep their existing locale negotiation behavior.
const localeLessPublicCanonicalRedirects = [
  {
    source: '/:path(pricing|enterprise|resources|faq|about|contact|book-demo|trust|security|compliance|data-processing|sla|privacy|terms|cookie-policy|acceptable-use|transfers|dpa|subprocessors|status|vulnerability-disclosure)',
    destination: '/en/:path',
    permanent: true,
  },
  {
    source: '/trust/:path*',
    destination: '/en/trust/:path*',
    permanent: true,
  },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'risckcomply.com' }],
        destination: 'https://www.risckcomply.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'risckcomply.app' }],
        destination: 'https://www.risckcomply.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.risckcomply.app' }],
        destination: 'https://www.risckcomply.com/:path*',
        permanent: true,
      },
      ...localeLessPublicCanonicalRedirects,
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/waitlist',
        destination: '/api/prelaunch',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/:locale(en|pt|es|fr|it|de)/(login|signup|register|reset-password|onboarding|checkout|dashboard|settings|billing|team|profile)(/:path*)?',
        headers: [...noIndexHeaders],
      },
      {
        source: '/:locale(en|pt|es|fr|it|de)/(pricing|resources|faq|about|contact|trust|security|compliance|privacy|terms|data-processing|sla|dpa|subprocessors|status|vulnerability-disclosure)',
        headers: [...publicCacheHeaders],
      },
      {
        source: '/:locale(pt|es|fr|it|de)/(compliance|status)',
        headers: [...provisionalLocaleNoIndexHeaders],
      },
      {
        source: '/:locale(en|pt|es|fr|it|de)/features/:path*',
        headers: [...publicCacheHeaders],
      },
    ];
  },
  images: {
    remotePatterns: trustedImageHostnames.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
};

const nextIntlConfig = withNextIntl(nextConfig);
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryReleaseUploadConfig =
  sentryOrg && sentryProject && sentryAuthToken
    ? {
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        widenClientFileUpload: true,
      }
    : {};

// Keep the Sentry Next.js wrapper enabled in every environment so runtime
// instrumentation and the tunnel route are registered. Source maps and release
// artifacts are uploaded only when SENTRY_AUTH_TOKEN plus org/project are set.
export default withSentryConfig(nextIntlConfig, {
  ...sentryReleaseUploadConfig,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring',
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
