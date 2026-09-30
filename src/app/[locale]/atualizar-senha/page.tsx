import Link from 'next/link';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: { title: 'Recovery link received', subtitle: 'Continue from your secure email link, then return to sign in.', action: 'Go to sign in' },
  pt: { title: 'Link de recuperação recebido', subtitle: 'Continue a partir do link seguro enviado por email e depois volte ao login.', action: 'Ir para login' },
  es: { title: 'Enlace de recuperación recibido', subtitle: 'Continúa desde el enlace seguro enviado por email y vuelve al inicio de sesión.', action: 'Ir al inicio de sesión' },
  fr: { title: 'Lien de récupération reçu', subtitle: 'Continuez depuis le lien sécurisé reçu par email puis revenez à la connexion.', action: 'Aller à la connexion' },
  it: { title: 'Link di recupero ricevuto', subtitle: 'Continua dal link sicuro ricevuto via email e poi torna al login.', action: 'Vai al login' },
  de: { title: 'Wiederherstellungslink erhalten', subtitle: 'Fahren Sie über den sicheren E-Mail-Link fort und kehren Sie dann zur Anmeldung zurück.', action: 'Zur Anmeldung' },
} as const;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : 'en') as Locale;
  const t = copy[locale];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e18] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0b121e] p-6 text-center sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">RISCK COMPLY</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-100">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{t.subtitle}</p>
        <Link href={`/${locale}/login`} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          {t.action}
        </Link>
      </section>
    </main>
  );
}
