import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { PostHogAnalyticsProvider } from '@/components/analytics/PostHogAnalyticsProvider';
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
import { PostHogScript } from '@/components/analytics/posthog-script';
import { AuthFloatingControls } from '@/components/auth/AuthFloatingControls';
import { AuthProviderGate } from '@/components/auth/AuthProviderGate';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffectsGate from '@/components/GlobalClientEffectsGate';
import GapAnalysisShortcut from '@/components/GapAnalysisShortcut';
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
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'EU AI Act readiness, AI system inventory, risk evidence, governance documents and audit workflows for European B2B teams.',
    },
    pt: {
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'Apoio à preparação para o AI Act, inventário de IA, visibilidade de riscos, preparação de evidências de governança e fluxos operacionais de compliance para equipas B2B europeias.',
    },
    es: {
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'Apoyo para la preparación ante el AI Act, inventario de IA, visibilidad de riesgos, preparación de evidencias de gobernanza y flujos operativos de compliance para equipos B2B europeos.',
    },
    fr: {
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'Accompagnement à la préparation au AI Act, inventaire des systèmes d’IA, visibilité des risques, préparation des preuves de gouvernance et flux opérationnels de conformité pour les équipes B2B européennes.',
    },
    it: {
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'Supporto alla preparazione per l’AI Act, inventario dei sistemi di IA, visibilità dei rischi, preparazione delle evidenze di governance e flussi operativi di compliance per team B2B europei.',
    },
    de: {
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'Unterstützung bei der Vorbereitung auf den AI Act, KI-Inventar, Risikotransparenz, Vorbereitung von Governance-Nachweisen und Compliance-Workflows für europäische B2B-Teams.',
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
  const safeLocale = (routing.locales.includes(locale as Locale) ? locale : 'en') as Locale;

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
        <PostHogScript />
      </body>
    </html>
  );
}
