import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
const isProduction = process.env.NODE_ENV === 'production';
const prelaunchAuthRedirectsEnabled = process.env.PRELAUNCH_AUTH_REDIRECTS === 'true';

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

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isProduction
        ? `script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.sentry.io https://*.ingest.sentry.io ${posthogScriptSrcPolicy}`
        : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io https://*.ingest.sentry.io ${posthogScriptSrcPolicy}`,
      "style-src 'self' 'unsafe-inline'",
      imageSrcPolicy,
      "media-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com ${posthogConnectSrcPolicy}`,
      "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()' },
];

const prelaunchAuthRedirects = [
  {
    source: '/:locale(en|pt|es|fr|it|de)/login',
    destination: '/:locale#waitlist-form',
    permanent: false,
  },
  {
    source: '/:locale(en|pt|es|fr|it|de)/signup',
    destination: '/:locale#waitlist-form',
    permanent: false,
  },
  {
    source: '/:locale(en|pt|es|fr|it|de)/register',
    destination: '/:locale#waitlist-form',
    permanent: false,
  },
  {
    source: '/:locale(en|pt|es|fr|it|de)/checkout',
    destination: '/:locale#waitlist-form',
    permanent: false,
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return prelaunchAuthRedirectsEnabled ? prelaunchAuthRedirects : [];
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
        source: '/:locale(en|pt|es|fr|it|de)/(pricing|resources|faq|about|contact|trust|security|compliance|privacy|terms|data-processing|sla|dpa|subprocessors|status)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
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
const sentryReleaseUploadConfig =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN
    ? {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
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
  disableLogger: true,
});
