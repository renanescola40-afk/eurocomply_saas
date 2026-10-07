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
      setError('Could not sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleGoogleLogin} disabled={loading}>
        {loading ? 'Redirecting...' : 'Sign in with Google'}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
