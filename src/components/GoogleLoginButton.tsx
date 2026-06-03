'use client'

import { supabase } from '@/lib/supabase/client' // ajuste o caminho

export function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    try {
      // Primeiro, busca a URL de autenticação do Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
      
      // Redireciona para a página de login do Google
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Erro no login:', error)
    }
  }

  return (
    <button onClick={handleGoogleLogin}>
      Entrar com Google
    </button>
  )
}
