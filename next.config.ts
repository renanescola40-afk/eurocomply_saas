import type { NextConfig } from "next";
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
    .map((host) => host.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_IMAGE_REMOTE_HOSTS, ...getSupabaseImageHost(), ...configuredHosts]));
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isProduction
        ? "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.sentry.io https://*.ingest.sentry.io"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io https://*.ingest.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com",
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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/:locale(en|pt|es|fr|it|de)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
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
    remotePatterns: getTrustedImageHostnames().map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
};

const nextIntlConfig = withNextIntl(nextConfig);
const hasSentryReleaseUploadCredentials = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
);

// Source maps and release artifacts are uploaded only when the server-side
// SENTRY_AUTH_TOKEN plus org/project are available in the build environment.
// Local/dev builds keep the Next config unwrapped, preventing accidental uploads.
export default hasSentryReleaseUploadCredentials
  ? withSentryConfig(nextIntlConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      disableLogger: true,
    })
  : nextIntlConfig;
