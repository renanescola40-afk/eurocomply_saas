'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const signupCopy: Record<string, {
  title: string;
  subtitle: string;
  google: string;
  name: string;
  company: string;
  email: string;
  password: string;
  submit: string;
  login: string;
  successTitle: string;
  successSubtitle: string;
  errorTitle: string;
}> = {
  en: {
    title: 'Create your EuroComply workspace',
    subtitle: 'Start organizing documents, vendors, risks and compliance tasks in one secure workspace.',
    google: 'Continue with Google',
    name: 'Full name',
    company: 'Company name',
    email: 'Email',
    password: 'Password',
    submit: 'Create account',
    login: 'Already have an account? Sign in',
    successTitle: 'Account created',
    successSubtitle: 'Check your email to confirm your account, then sign in to continue.',
    errorTitle: 'Could not create account',
  },
  pt: {
    title: 'Crie seu workspace EuroComply',
    subtitle: 'Comece a organizar documentos, vendors, riscos e tarefas de compliance em um workspace seguro.',
    google: 'Continuar com Google',
    name: 'Nome completo',
    company: 'Nome da empresa',
    email: 'Email',
    password: 'Senha',
    submit: 'Criar conta',
    login: 'Já tem conta? Entrar',
    successTitle: 'Conta criada',
    successSubtitle: 'Verifique seu email para confirmar a conta e depois faça login.',
    errorTitle: 'Não foi possível criar a conta',
  },
  es: {
    title: 'Crea tu workspace EuroComply',
    subtitle: 'Organiza documentos, proveedores, riesgos y tareas de compliance en un workspace seguro.',
    google: 'Continuar con Google',
    name: 'Nombre completo',
    company: 'Empresa',
    email: 'Email',
    password: 'Contraseña',
    submit: 'Crear cuenta',
    login: '¿Ya tienes cuenta? Entrar',
    successTitle: 'Cuenta creada',
    successSubtitle: 'Revisa tu email para confirmar la cuenta y luego inicia sesión.',
    errorTitle: 'No se pudo crear la cuenta',
  },
  fr: {
    title: 'Créez votre espace EuroComply',
    subtitle: 'Organisez documents, fournisseurs, risques et tâches compliance dans un espace sécurisé.',
    google: 'Continuer avec Google',
    name: 'Nom complet',
    company: 'Entreprise',
    email: 'Email',
    password: 'Mot de passe',
    submit: 'Créer un compte',
    login: 'Déjà un compte ? Connexion',
    successTitle: 'Compte créé',
    successSubtitle: 'Vérifiez votre email pour confirmer le compte, puis connectez-vous.',
    errorTitle: 'Impossible de créer le compte',
  },
  it: {
    title: 'Crea il tuo workspace EuroComply',
    subtitle: 'Organizza documenti, fornitori, rischi e attività compliance in un workspace sicuro.',
    google: 'Continua con Google',
    name: 'Nome completo',
    company: 'Azienda',
    email: 'Email',
    password: 'Password',
    submit: 'Crea account',
    login: 'Hai già un account? Accedi',
    successTitle: 'Account creato',
    successSubtitle: 'Controlla la tua email per confermare l’account, poi accedi.',
    errorTitle: 'Impossibile creare account',
  },
  de: {
    title: 'EuroComply Workspace erstellen',
    subtitle: 'Organisieren Sie Dokumente, Lieferanten, Risiken und Compliance-Aufgaben sicher an einem Ort.',
    google: 'Mit Google fortfahren',
    name: 'Vollständiger Name',
    company: 'Unternehmen',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Konto erstellen',
    login: 'Schon ein Konto? Anmelden',
    successTitle: 'Konto erstellt',
    successSubtitle: 'Bestätigen Sie Ihr Konto per E-Mail und melden Sie sich anschließend an.',
    errorTitle: 'Konto konnte nicht erstellt werden',
  },
};

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'pt';
  const copy = signupCopy[locale] ?? signupCopy.en;
  const { user, signUpWithEmail, signInWithGoogle, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [authLoading, locale, router, user]);

  async function handleGoogleSignup() {
    setError('');
    setSubmitting(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
    }
  }

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    const result = await signUpWithEmail(email, password, {
      name,
      company_name: companyName,
    });

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(37,99,235,0.24),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-white/36">EuroComply</p>
            <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
            <p className="mt-2 text-sm text-white/50">{copy.subtitle}</p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left text-sm text-red-200">
              <p className="font-semibold">{copy.errorTitle}</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-left text-sm text-emerald-200">
              <p className="font-semibold">{copy.successTitle}</p>
              <p className="mt-1">{copy.successSubtitle}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <Button
              type="button"
              className="w-full bg-white text-black hover:bg-white/90"
              onClick={handleGoogleSignup}
              disabled={submitting || authLoading}
            >
              {copy.google}
            </Button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-3">
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.name}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.company}</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.email}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/70">{copy.password}</span>
                <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/30" />
              </label>
              <Button type="submit" className="w-full" disabled={submitting || authLoading}>
                {copy.submit}
              </Button>
            </form>

            <Link href={`/${locale}/login`} className="block text-center text-sm text-white/50 hover:text-white">
              {copy.login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
