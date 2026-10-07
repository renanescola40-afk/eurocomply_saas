import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { PostHogAnalyticsProvider } from '@/components/analytics/PostHogAnalyticsProvider';
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
import { AuthFloatingControls } from '@/components/auth/AuthFloatingControls';
import { AuthProviderGate } from '@/components/auth/AuthProviderGate';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffectsGate from '@/components/GlobalClientEffectsGate';
import GapAnalysisShortcut from '@/components/GapAnalysisShortcut';
import { routing, type Locale } from '@/lib/i18n/routing';
import {
  classifyLocalizedCommercialRoute,
  INTERNAL_PATHNAME_HEADER,
} from '@/lib/security/commercial-route-policy';
import { requireLicensedCommercialPageAccess } from '@/server/security/commercial-access';
import '../globals.css';

// Commercial authorization for localized surfaces depends on the trusted
// request pathname injected by middleware. Keep this boundary request-time so
// static prerendering can never evaluate an empty pathname and accidentally
// fail-close an explicitly public or billing-recovery page.
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'RISCK COMPLY - AI Compliance Operating System',
    description:
      'EU AI Act readiness, AI system inventory, risk evidence, governance documents and audit workflows for European B2B teams.',
  };
}
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const safeLocale = (routing.locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(INTERNAL_PATHNAME_HEADER) ?? '';
  const commercialRouteClass = classifyLocalizedCommercialRoute(pathname, safeLocale);

  // The locale layout is the shared server boundary for every localized product
  // route, including legacy top-level surfaces that live outside /dashboard.
  // Public, onboarding/profile, billing recovery and privileged control-plane
  // routes are explicit exceptions; everything else is licensed by default.
  if (commercialRouteClass === 'licensed_product') {
    await requireLicensedCommercialPageAccess({
      locale: safeLocale,
      pathname,
    });
  }

  setRequestLocale(safeLocale);
  const messages = await getMessages();

  const sharedShell = (
    <>
      {children}
      <GapAnalysisShortcut />
      <GlobalClientEffectsGate />
      <AnalyticsConsentBanner />
      <Toaster />
    </>
  );

  return (
    <html lang={safeLocale} suppressHydrationWarning>
      <head>
        <meta
          name="_bisamchjnirjhuim3bllnxun2zl0dfd8"
          {...{ signature: '_e8flhq2qpr6fuvd036hr4l97yn8octew' }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <PostHogAnalyticsProvider>
              <AuthProviderGate>
                {sharedShell}
                <AuthFloatingControls locale={safeLocale} />
              </AuthProviderGate>
            </PostHogAnalyticsProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
