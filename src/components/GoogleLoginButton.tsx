'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function GoogleLoginButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const result = await signInWithGoogle();

    if (result.error) {
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleGoogleLogin} disabled={loading}>
        {loading ? 'Redirecionando...' : 'Entrar com Google'}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
