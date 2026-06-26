import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { PostHogAnalyticsProvider } from '@/components/analytics/PostHogAnalyticsProvider';
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
import { ClerkFloatingControls } from '@/components/auth/ClerkFloatingControls';
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
      title: 'RISCK COMPLY - European Compliance Operating System',
      description: 'Control deadlines, risks, documents, audit logs and fiscal identifiers across Europe.',
    },
    pt: {
      title: 'RISCK COMPLY - Sistema Operacional de Compliance Europeu',
      description: 'Controle prazos, riscos, documentos, logs de auditoria e identificações fiscais na Europa.',
    },
    es: {
      title: 'RISCK COMPLY - Sistema Operativo de Compliance Europeo',
      description: 'Controle plazos, riesgos, documentos, registros de auditoría e identificadores fiscales en Europa.',
    },
    fr: {
      title: 'RISCK COMPLY - Système Opérationnel de Conformité Européenne',
      description: 'Pilotez échéances, risques, documents, journaux d’audit et identifiants fiscaux en Europe.',
    },
    it: {
      title: 'RISCK COMPLY - Sistema Operativo di Compliance Europea',
      description: 'Gestisci scadenze, rischi, documenti, registri di audit e identificativi fiscali in Europa.',
    },
    de: {
      title: 'RISCK COMPLY - Europäisches Compliance-Betriebssystem',
      description: 'Steuern Sie Fristen, Risiken, Dokumente, Audit-Logs und Steuerkennungen in Europa.',
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
        <ClerkProvider>
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
                  <ClerkFloatingControls locale={safeLocale} />
                  <GapAnalysisShortcut />
                  <GlobalClientEffects />
                  <AnalyticsConsentBanner />
                  <Toaster />
                </PostHogAnalyticsProvider>
              </AuthProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
