import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import GlobalClientEffects from '@/components/GlobalClientEffects';
import DashboardI18nRuntime from '@/components/DashboardI18nRuntime';
import { AuthProvider } from '@/hooks/useAuth';
import { routing } from '@/lib/i18n/routing';

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
  const labels: Record<string, { title: string; description: string }> = {
    en: {
      title: 'EuroComply AI - AI Compliance Platform for Europe',
      description: 'Automate documentation, governance and AI compliance in minutes.',
    },
    pt: {
      title: 'EuroComply AI - Plataforma de Compliance de IA para a Europa',
      description: 'Automatize documentação, governança e compliance de IA em minutos.',
    },
    es: {
      title: 'EuroComply AI - Plataforma de Cumplimiento de IA para Europa',
      description: 'Automatiza documentación, gobernanza y cumplimiento de IA en minutos.',
    },
    fr: {
      title: 'EuroComply AI - Plateforme de Conformité IA pour l\'Europe',
      description: 'Automatisez documentation, gouvernance et conformité IA en minutes.',
    },
    it: {
      title: 'EuroComply AI - Piattaforma di Conformità IA per l\'Europa',
      description: 'Automatizza documentazione, governance e conformità IA in pochi minuti.',
    },
    de: {
      title: 'EuroComply AI - KI-Compliance-Plattform für Europa',
      description: 'Automatisieren Sie Dokumentation, Governance und KI-Compliance in Minuten.',
    },
  };

  const meta = labels[locale] ?? labels.en;

  return {
    title: meta.title,
    description: meta.description,
    icons: {
      icon: [
        {
          url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%230F172A' rx='15' width='100' height='100'/><text y='70' x='50' text-anchor='middle' font-size='60' fill='white' font-family='system-ui'>EC</text></svg>",
          type: 'image/svg+xml',
        },
      ],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en')) {
    // redirect handled by middleware, but safe fallback
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
            <DashboardI18nRuntime />
            <GlobalClientEffects />
            <Toaster />
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
