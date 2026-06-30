import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { PostHogAnalyticsProvider } from '@/components/analytics/PostHogAnalyticsProvider';
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
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
      title: 'Risck Comply - AI Compliance Operating System',
      description: 'EU AI Act readiness, AI system inventory, risk evidence, governance documents and audit workflows for European B2B teams.',
    },
    pt: {
      title: 'Risck Comply - Sistema Operacional de Compliance de IA',
      description: 'AI Act readiness, inventário de sistemas de IA, evidências de risco, documentos de governação e auditoria para equipas B2B europeias.',
    },
    es: {
      title: 'Risck Comply - Sistema Operativo de Compliance de IA',
      description: 'AI Act readiness, inventario de sistemas de IA, evidencias de riesgo, documentos de gobernanza y auditoría para equipos B2B europeos.',
    },
    fr: {
      title: 'Risck Comply - Système Opérationnel de Conformité IA',
      description: 'AI Act readiness, inventaire des systèmes IA, preuves de risque, documents de gouvernance et workflows d’audit pour équipes B2B européennes.',
    },
    it: {
      title: 'Risck Comply - Sistema Operativo di Compliance IA',
      description: 'AI Act readiness, inventario dei sistemi IA, evidenze di rischio, documenti di governance e workflow di audit per team B2B europei.',
    },
    de: {
      title: 'Risck Comply - Betriebssystem für KI-Compliance',
      description: 'AI Act Readiness, KI-Systeminventar, Risikonachweise, Governance-Dokumente und Audit-Workflows für europäische B2B-Teams.',
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
                {children}
                <GapAnalysisShortcut />
                <GlobalClientEffects />
                <AnalyticsConsentBanner />
                <Toaster />
              </PostHogAnalyticsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
