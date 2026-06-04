'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'pt';
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const startedGoogleLogin = useRef(false);

  useEffect(() => {
    if (authLoading || startedGoogleLogin.current) return;

    if (user) {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    startedGoogleLogin.current = true;

    signInWithGoogle().then((result) => {
      if (result.error) {
        setError(result.error.message);
        startedGoogleLogin.current = false;
      }
    });
  }, [authLoading, locale, router, signInWithGoogle, user]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Fingerprint className="h-6 w-6" />
          </div>

          <p className="text-xs uppercase tracking-[0.28em] text-white/36">Acesso seguro</p>
          <h1 className="mt-2 text-2xl font-semibold">Redirecionando para o Google</h1>
          <p className="mt-2 text-sm text-white/50">Você será levado diretamente para o login seguro do Google.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              <p>{error}</p>
              <Button
                type="button"
                className="mt-4 w-full bg-white text-black hover:bg-white/90"
                onClick={() => {
                  setError('');
                  startedGoogleLogin.current = false;
                  signInWithGoogle().then((result) => {
                    if (result.error) setError(result.error.message);
                  });
                }}
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
