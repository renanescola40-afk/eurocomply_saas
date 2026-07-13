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
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <section className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.28em] text-white/36">RISCK COMPLY</p>
          <h1 className="mt-3 text-3xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">{t.subtitle}</p>
          <Link href={`/${locale}/login`} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-black hover:bg-white/90">
            {t.action}
          </Link>
        </section>
      </div>
    </main>
  );
}
