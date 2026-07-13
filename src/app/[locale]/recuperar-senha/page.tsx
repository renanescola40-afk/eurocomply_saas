import Link from 'next/link';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: {
    title: 'Account recovery',
    subtitle: 'Use the sign-in page to request a secure recovery link for your workspace account.',
    action: 'Back to sign in',
  },
  pt: {
    title: 'Recuperação de conta',
    subtitle: 'Use a página de login para pedir um link seguro de recuperação da sua conta do workspace.',
    action: 'Voltar ao login',
  },
  es: {
    title: 'Recuperación de cuenta',
    subtitle: 'Usa la página de inicio de sesión para solicitar un enlace seguro de recuperación.',
    action: 'Volver al inicio de sesión',
  },
  fr: {
    title: 'Récupération de compte',
    subtitle: 'Utilisez la page de connexion pour demander un lien de récupération sécurisé.',
    action: 'Retour à la connexion',
  },
  it: {
    title: 'Recupero account',
    subtitle: 'Usa la pagina di accesso per richiedere un link sicuro di recupero.',
    action: 'Torna al login',
  },
  de: {
    title: 'Kontowiederherstellung',
    subtitle: 'Verwenden Sie die Anmeldeseite, um einen sicheren Wiederherstellungslink anzufordern.',
    action: 'Zurück zur Anmeldung',
  },
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
