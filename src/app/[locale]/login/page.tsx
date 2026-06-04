'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Fingerprint } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'pt';
  const { signInWithEmail, signInWithGoogle, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signInWithEmail(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(`/${locale}/dashboard`);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const result = await signInWithGoogle();

    if (result.error) {
      setLoading(false);
      setError(result.error.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <Link href={`/${locale}`} className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">EuroComply AI</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">AI Governance</p>
            </div>
          </Link>

          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-white/36">Acesso seguro</p>
            <h1 className="mt-2 text-2xl font-semibold">Entrar na sua conta</h1>
            <p className="mt-2 text-sm text-white/50">Acesse o painel do EuroComply.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mb-4 w-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
            onClick={handleGoogleLogin}
            disabled={loading || authLoading}
          >
            Continuar com Google
          </Button>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              className="border-white/10 bg-white/[0.05] text-white placeholder:text-white/35"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                className="border-white/10 bg-white/[0.05] pr-10 text-white placeholder:text-white/35"
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/42"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90"
              disabled={loading || authLoading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-white/52">
            Ainda não tem conta?{' '}
            <Link href={`/${locale}`} className="text-white hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
