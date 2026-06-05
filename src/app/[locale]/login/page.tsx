'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
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

    // If Supabase returned an error to /pt/login?error=..., do not immediately
    // start OAuth again. That creates an infinite Google/Supabase loop.
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

          <p className="text-xs uppercase tracking-[0.28em] text-white/36">Acesso seguro</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {error ? 'Não foi possível concluir o login' : 'Redirecionando para o Google'}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {error
              ? 'Revise a mensagem abaixo e tente novamente.'
              : 'Você será levado diretamente para o login seguro do Google.'}
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              <p className="break-words">{error}</p>
              <Button
                type="button"
                className="mt-4 w-full bg-white text-black hover:bg-white/90"
                onClick={retryGoogleLogin}
              >
                Tentar novamente com Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
