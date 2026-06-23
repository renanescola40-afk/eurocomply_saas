'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';
import { normalizePublicAuthErrorCode, type PublicAuthErrorCode } from '@/lib/auth/public-errors';

const loginCopy: Record<string, {
  title: string;
  subtitle: string;
  google: string;
  separator: string;
  email: string;
  password: string;
  submit: string;
  signup: string;
  errorTitle: string;
  publicErrors: Record<PublicAuthErrorCode, string>;
}> = {
  en: {
    title: 'Sign in to Risck comply',
    subtitle: 'Access your compliance workspace with Google or email.',
    google: 'Continue with Google',
    separator: 'or',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in with email',
    signup: 'Create an account',
    errorTitle: 'Could not complete sign-in',
    publicErrors: {
      missing_oauth_code: 'The sign-in request could not be verified. Please try again.',
      auth_configuration_unavailable: 'Sign-in is temporarily unavailable. Please try again later.',
      auth_exchange_failed: 'The sign-in request expired or could not be completed. Please try again.',
      email_sign_in_failed: 'The email or password could not be verified. Please try again.',
    },
  },
  pt: {
    title: 'Entrar no Risck comply',
    subtitle: 'Aceda ao seu workspace de compliance com Google ou email.',
    google: 'Continuar com Google',
    separator: 'ou',
    email: 'Email',
    password: 'Palavra-passe',
    submit: 'Entrar com email',
    signup: 'Criar conta',
    errorTitle: 'Não foi possível concluir o login',
    publicErrors: {
      missing_oauth_code: 'Não foi possível validar o pedido de login. Tente novamente.',
      auth_configuration_unavailable: 'O login está temporariamente indisponível. Tente novamente mais tarde.',
      auth_exchange_failed: 'O pedido de login expirou ou não pôde ser concluído. Tente novamente.',
      email_sign_in_failed: 'Não foi possível validar o email ou a palavra-passe. Tente novamente.',
    },
  },
  es: {
    title: 'Entrar en Risck comply',
    subtitle: 'Accede a tu workspace de compliance con Google o email.',
    google: 'Continuar con Google',
    separator: 'o',
    email: 'Email',
    password: 'Contraseña',
    submit: 'Entrar con email',
    signup: 'Crear cuenta',
    errorTitle: 'No se pudo completar el inicio de sesión',
    publicErrors: {
      missing_oauth_code: 'No se pudo verificar la solicitud de inicio de sesión. Inténtalo de nuevo.',
      auth_configuration_unavailable: 'El inicio de sesión no está disponible temporalmente. Inténtalo más tarde.',
      auth_exchange_failed: 'La solicitud expiró o no pudo completarse. Inténtalo de nuevo.',
      email_sign_in_failed: 'No se pudo verificar el email o la contraseña. Inténtalo de nuevo.',
    },
  },
  fr: {
    title: 'Connexion à Risck comply',
    subtitle: 'Accédez à votre espace compliance avec Google ou email.',
    google: 'Continuer avec Google',
    separator: 'ou',
    email: 'Email',
    password: 'Mot de passe',
    submit: 'Connexion par email',
    signup: 'Créer un compte',
    errorTitle: 'Impossible de terminer la connexion',
    publicErrors: {
      missing_oauth_code: 'La demande de connexion n’a pas pu être vérifiée. Réessayez.',
      auth_configuration_unavailable: 'La connexion est temporairement indisponible. Réessayez plus tard.',
      auth_exchange_failed: 'La demande de connexion a expiré ou n’a pas pu aboutir. Réessayez.',
      email_sign_in_failed: 'L’email ou le mot de passe n’a pas pu être vérifié. Réessayez.',
    },
  },
  it: {
    title: 'Accedi a Risck comply',
    subtitle: 'Accedi al workspace compliance con Google o email.',
    google: 'Continua con Google',
    separator: 'o',
    email: 'Email',
    password: 'Password',
    submit: 'Accedi con email',
    signup: 'Crea account',
    errorTitle: 'Impossibile completare l’accesso',
    publicErrors: {
      missing_oauth_code: 'La richiesta di accesso non può essere verificata. Riprova.',
      auth_configuration_unavailable: 'L’accesso è temporaneamente non disponibile. Riprova più tardi.',
      auth_exchange_failed: 'La richiesta di accesso è scaduta o non può essere completata. Riprova.',
      email_sign_in_failed: 'Non è stato possibile verificare email o password. Riprova.',
    },
  },
  de: {
    title: 'Bei Risck comply anmelden',
    subtitle: 'Melden Sie sich mit Google oder E-Mail an.',
    google: 'Mit Google fortfahren',
    separator: 'oder',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Mit E-Mail anmelden',
    signup: 'Konto erstellen',
    errorTitle: 'Anmeldung konnte nicht abgeschlossen werden',
    publicErrors: {
      missing_oauth_code: 'Die Anmeldung konnte nicht verifiziert werden. Bitte versuchen Sie es erneut.',
      auth_configuration_unavailable: 'Die Anmeldung ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
      auth_exchange_failed: 'Die Anmeldung ist abgelaufen oder konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
      email_sign_in_failed: 'E-Mail oder Passwort konnten nicht verifiziert werden. Bitte versuchen Sie es erneut.',
    },
  },
};

function getDashboardHref(locale: string) {
  return `/${locale}/dashboard/organizations`;
}

function getSafeNextPath(next: string | null, locale: string) {
  if (!next || next.includes('://') || next.startsWith('//')) {
    return getDashboardHref(locale);
  }

  if (!next.startsWith(`/${locale}/dashboard`)) {
    return getDashboardHref(locale);
  }

  return next;
}

function getPublicAuthErrorMessage(rawError: string | null, copy: (typeof loginCopy)[string]) {
  if (!rawError) return '';
  const code = normalizePublicAuthErrorCode(rawError);
  return copy.publicErrors[code];
}

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = loginCopy[activeLocale] ?? loginCopy.en;
  const urlError = getPublicAuthErrorMessage(searchParams.get('error'), copy);
  const nextPath = getSafeNextPath(searchParams.get('next'), activeLocale);
  const googleLoginHref = `/auth/google?locale=${encodeURIComponent(activeLocale)}&next=${encodeURIComponent(nextPath)}`;
  const { user, signInWithEmail, loading: authLoading } = useAuth();
  const [error, setError] = useState(urlError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      router.replace(nextPath);
    }
  }, [authLoading, nextPath, router, user]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await signInWithEmail(email, password);

    if (result.error) {
      setError(copy.publicErrors.email_sign_in_failed);
      setSubmitting(false);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />
      <div className="fixed right-5 top-5 z-20">
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
            <Image src="/brand/risck-comply-icon.svg" alt="Risck comply" width={48} height={48} className="h-12 w-12 object-contain" priority />
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-white/36">{t('secure')}</p>
            <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-2 text-sm text-white/50">{copy.subtitle}</p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              <p className="font-semibold">{copy.errorTitle}</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <Link
              href={googleLoginHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50"
            >
              {copy.google}
            </Link>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              {copy.separator}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3">
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.password}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30"
                />
              </label>
              <Button type="submit" className="w-full" disabled={submitting || authLoading}>
                {copy.submit}
              </Button>
            </form>

            <Link href={`/${activeLocale}/signup`} className="block text-center text-sm text-white/50 hover:text-white">
              {copy.signup}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
