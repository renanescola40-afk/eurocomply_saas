import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { PostHogAnalyticsProvider } from '@/components/analytics/PostHogAnalyticsProvider';
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
import { AuthFloatingControls } from '@/components/auth/AuthFloatingControls';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import GapAnalysisShortcut from '@/components/GapAnalysisShortcut';
import { AuthProvider } from '@/hooks/useAuth';
import { routing, type Locale } from '@/lib/i18n/routing';

import '../globals.css';

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const labels: Record<Locale, { title: string; description: string }> = {
    en: {
      title: 'RISCK COMPLY - AI Governance Readiness Platform',
      description: 'AI Act readiness support, AI inventory, risk visibility, governance evidence preparation and compliance operations workflows for European B2B teams.',
    },
    pt: {
      title: 'RISCK COMPLY - Plataforma de AI Governance Readiness',
      description: 'Suporte a AI Act readiness, inventario de IA, visibilidade de risco, preparacao de evidencias de governanca e workflows de operacoes de compliance para equipas B2B europeias.',
    },
    es: {
      title: 'RISCK COMPLY - Plataforma de AI Governance Readiness',
      description: 'Soporte de AI Act readiness, inventario de IA, visibilidad de riesgos, preparacion de evidencias de gobernanza y workflows de operaciones de compliance para equipos B2B europeos.',
    },
    fr: {
      title: 'RISCK COMPLY - Plateforme AI Governance Readiness',
      description: 'Support AI Act readiness, inventaire IA, visibilite des risques, preparation des preuves de gouvernance et workflows operations compliance pour equipes B2B europeennes.',
    },
    it: {
      title: 'RISCK COMPLY - Piattaforma AI Governance Readiness',
      description: 'Supporto AI Act readiness, inventario IA, visibilita del rischio, preparazione delle evidenze di governance e workflow operativi di compliance per team B2B europei.',
    },
    de: {
      title: 'RISCK COMPLY - Plattform fuer AI Governance Readiness',
      description: 'AI Act Readiness Support, KI-Inventar, Risikosichtbarkeit, Governance-Nachweisvorbereitung und Compliance-Operations-Workflows fuer europaeische B2B-Teams.',
    },
  };

  const safeLocale = routing.locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  const meta = labels[safeLocale];

  return {
    title: meta.title,
    description: meta.description,
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? locale : 'en';
  const messages = await getMessages();

  const sharedShell = (
    <>
      {children}
      <GapAnalysisShortcut />
      <GlobalClientEffects />
      <AnalyticsConsentBanner />
      <Toaster />
    </>
  );

  return (
    <html lang={safeLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              <PostHogAnalyticsProvider>
                {sharedShell}
                <AuthFloatingControls locale={safeLocale} />
              </PostHogAnalyticsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
