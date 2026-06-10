'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

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
}> = {
  en: {
    title: 'Sign in to EuroComply',
    subtitle: 'Access your compliance workspace with Google or email.',
    google: 'Continue with Google',
    separator: 'or',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in with email',
    signup: 'Create an account',
    errorTitle: 'Could not complete sign-in',
  },
  pt: {
    title: 'Entrar no EuroComply',
    subtitle: 'Aceda ao seu workspace de compliance com Google ou email.',
    google: 'Continuar com Google',
    separator: 'ou',
    email: 'Email',
    password: 'Palavra-passe',
    submit: 'Entrar com email',
    signup: 'Criar conta',
    errorTitle: 'Não foi possível concluir o login',
  },
  es: {
    title: 'Entrar en EuroComply',
    subtitle: 'Accede a tu workspace de compliance con Google o email.',
    google: 'Continuar con Google',
    separator: 'o',
    email: 'Email',
    password: 'Contraseña',
    submit: 'Entrar con email',
    signup: 'Crear cuenta',
    errorTitle: 'No se pudo completar el inicio de sesión',
  },
  fr: {
    title: 'Connexion à EuroComply',
    subtitle: 'Accédez à votre espace compliance avec Google ou email.',
    google: 'Continuer avec Google',
    separator: 'ou',
    email: 'Email',
    password: 'Mot de passe',
    submit: 'Connexion par email',
    signup: 'Créer un compte',
    errorTitle: 'Impossible de terminer la connexion',
  },
  it: {
    title: 'Accedi a EuroComply',
    subtitle: 'Accedi al workspace compliance con Google o email.',
    google: 'Continua con Google',
    separator: 'o',
    email: 'Email',
    password: 'Password',
    submit: 'Accedi con email',
    signup: 'Crea account',
    errorTitle: 'Impossibile completare l’accesso',
  },
  de: {
    title: 'Bei EuroComply anmelden',
    subtitle: 'Melden Sie sich mit Google oder E-Mail an.',
    google: 'Mit Google fortfahren',
    separator: 'oder',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Mit E-Mail anmelden',
    signup: 'Konto erstellen',
    errorTitle: 'Anmeldung konnte nicht abgeschlossen werden',
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

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const copy = loginCopy[locale] ?? loginCopy.en;
  const urlError = searchParams.get('error');
  const nextPath = getSafeNextPath(searchParams.get('next'), locale);
  const googleLoginHref = `/auth/google?locale=${encodeURIComponent(locale)}&next=${encodeURIComponent(nextPath)}`;
  const { user, signInWithEmail, loading: authLoading } = useAuth();
  const [error, setError] = useState(urlError ? decodeURIComponent(urlError) : '');
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
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Fingerprint className="h-6 w-6" />
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

            <Link href={`/${locale}/signup`} className="block text-center text-sm text-white/50 hover:text-white">
              {copy.signup}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
