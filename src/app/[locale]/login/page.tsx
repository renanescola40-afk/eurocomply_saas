'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const loginCopy: Record<string, {
  errorTitle: string;
  redirectTitle: string;
  errorSubtitle: string;
  redirectSubtitle: string;
  retryGoogle: string;
}> = {
  en: {
    errorTitle: 'Could not complete sign-in',
    redirectTitle: 'Redirecting to Google',
    errorSubtitle: 'Review the message below and try again.',
    redirectSubtitle: 'You will be taken to secure Google sign-in.',
    retryGoogle: 'Try again with Google',
  },
  pt: {
    errorTitle: 'Não foi possível concluir o login',
    redirectTitle: 'Redirecionando para o Google',
    errorSubtitle: 'Revise a mensagem abaixo e tente novamente.',
    redirectSubtitle: 'Você será levado diretamente para o login seguro do Google.',
    retryGoogle: 'Tentar novamente com Google',
  },
  es: {
    errorTitle: 'No se pudo completar el inicio de sesión',
    redirectTitle: 'Redirigiendo a Google',
    errorSubtitle: 'Revisa el mensaje abajo e inténtalo de nuevo.',
    redirectSubtitle: 'Serás enviado al inicio de sesión seguro de Google.',
    retryGoogle: 'Intentar de nuevo con Google',
  },
  fr: {
    errorTitle: 'Impossible de terminer la connexion',
    redirectTitle: 'Redirection vers Google',
    errorSubtitle: 'Vérifiez le message ci-dessous et réessayez.',
    redirectSubtitle: 'Vous allez être redirigé vers la connexion sécurisée Google.',
    retryGoogle: 'Réessayer avec Google',
  },
  it: {
    errorTitle: 'Impossibile completare l’accesso',
    redirectTitle: 'Reindirizzamento a Google',
    errorSubtitle: 'Controlla il messaggio qui sotto e riprova.',
    redirectSubtitle: 'Verrai portato al login sicuro di Google.',
    retryGoogle: 'Riprova con Google',
  },
  de: {
    errorTitle: 'Anmeldung konnte nicht abgeschlossen werden',
    redirectTitle: 'Weiterleitung zu Google',
    errorSubtitle: 'Prüfen Sie die Meldung unten und versuchen Sie es erneut.',
    redirectSubtitle: 'Sie werden zur sicheren Google-Anmeldung weitergeleitet.',
    retryGoogle: 'Erneut mit Google versuchen',
  },
};

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const copy = loginCopy[locale] ?? loginCopy.en;
  const urlError = searchParams.get('error');
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [error, setError] = useState(urlError ? decodeURIComponent(urlError) : '');
  const startedGoogleLogin = useRef(false);

  useEffect(() => {
    if (authLoading || startedGoogleLogin.current) return;

    if (user) {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    if (urlError) {
      setError(decodeURIComponent(urlError));
      return;
    }

    startedGoogleLogin.current = true;

    signInWithGoogle().then((result) => {
      if (result.error) {
        setError(result.error.message);
        startedGoogleLogin.current = false;
      }
    });
  }, [authLoading, locale, router, signInWithGoogle, urlError, user]);

  const retryGoogleLogin = () => {
    setError('');
    startedGoogleLogin.current = true;
    router.replace(`/${locale}/login`);
    signInWithGoogle().then((result) => {
      if (result.error) {
        setError(result.error.message);
        startedGoogleLogin.current = false;
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Fingerprint className="h-6 w-6" />
          </div>

          <p className="text-xs uppercase tracking-[0.28em] text-white/36">{t('secure')}</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {error ? copy.errorTitle : copy.redirectTitle}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {error ? copy.errorSubtitle : copy.redirectSubtitle}
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              <p className="break-words">{error}</p>
              <Button
                type="button"
                className="mt-4 w-full bg-white text-black hover:bg-white/90"
                onClick={retryGoogleLogin}
              >
                {copy.retryGoogle}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
