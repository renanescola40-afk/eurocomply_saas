'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';

const signupCopy: Record<string, {
  title: string;
  subtitle: string;
  google: string;
  separator: string;
  name: string;
  company: string;
  email: string;
  password: string;
  submit: string;
  login: string;
  successTitle: string;
  successSubtitle: string;
  errorTitle: string;
  selectedPlan: string;
  planHelp: string;
}> = {
  en: {
    title: 'Create your EuroComply workspace',
    subtitle: 'Start organizing documents, vendors, risks and compliance tasks in one secure workspace.',
    google: 'Continue with Google',
    separator: 'or',
    name: 'Full name',
    company: 'Company name',
    email: 'Email',
    password: 'Password',
    submit: 'Create account',
    login: 'Already have an account? Sign in',
    successTitle: 'Account created',
    successSubtitle: 'Check your email to confirm your account, then sign in to continue.',
    errorTitle: 'Could not create account',
    selectedPlan: 'Selected plan',
    planHelp: 'This plan is stored with your signup so checkout/onboarding can continue with the right package.',
  },
  pt: {
    title: 'Crie o seu workspace EuroComply',
    subtitle: 'Comece a organizar documentos, fornecedores, riscos e tarefas de compliance num workspace seguro.',
    google: 'Continuar com Google',
    separator: 'ou',
    name: 'Nome completo',
    company: 'Nome da empresa',
    email: 'Email',
    password: 'Palavra-passe',
    submit: 'Criar conta',
    login: 'Já tem conta? Entrar',
    successTitle: 'Conta criada',
    successSubtitle: 'Verifique o seu email para confirmar a conta e depois faça login.',
    errorTitle: 'Não foi possível criar a conta',
    selectedPlan: 'Plano selecionado',
    planHelp: 'Este plano fica guardado no registo para o checkout/onboarding continuar com o pacote certo.',
  },
  es: {
    title: 'Crea tu workspace EuroComply',
    subtitle: 'Organiza documentos, proveedores, riesgos y tareas de compliance en un workspace seguro.',
    google: 'Continuar con Google',
    separator: 'o',
    name: 'Nombre completo',
    company: 'Empresa',
    email: 'Email',
    password: 'Contraseña',
    submit: 'Crear cuenta',
    login: '¿Ya tienes cuenta? Entrar',
    successTitle: 'Cuenta creada',
    successSubtitle: 'Revisa tu email para confirmar la cuenta y luego inicia sesión.',
    errorTitle: 'No se pudo crear la cuenta',
    selectedPlan: 'Plan seleccionado',
    planHelp: 'Este plan se guarda con el registro para continuar el checkout/onboarding correcto.',
  },
  fr: {
    title: 'Créez votre espace EuroComply',
    subtitle: 'Organisez documents, fournisseurs, risques et tâches compliance dans un espace sécurisé.',
    google: 'Continuer avec Google',
    separator: 'ou',
    name: 'Nom complet',
    company: 'Entreprise',
    email: 'Email',
    password: 'Mot de passe',
    submit: 'Créer un compte',
    login: 'Déjà un compte ? Connexion',
    successTitle: 'Compte créé',
    successSubtitle: 'Vérifiez votre email pour confirmer le compte, puis connectez-vous.',
    errorTitle: 'Impossible de créer le compte',
    selectedPlan: 'Forfait sélectionné',
    planHelp: 'Ce forfait est conservé avec l’inscription pour poursuivre le bon checkout/onboarding.',
  },
  it: {
    title: 'Crea il tuo workspace EuroComply',
    subtitle: 'Organizza documenti, fornitori, rischi e attività compliance in un workspace sicuro.',
    google: 'Continua con Google',
    separator: 'o',
    name: 'Nome completo',
    company: 'Azienda',
    email: 'Email',
    password: 'Password',
    submit: 'Crea account',
    login: 'Hai già un account? Accedi',
    successTitle: 'Account creato',
    successSubtitle: 'Controlla la tua email per confermare l’account, poi accedi.',
    errorTitle: 'Impossibile creare account',
    selectedPlan: 'Piano selezionato',
    planHelp: 'Questo piano viene salvato con la registrazione per continuare il checkout/onboarding corretto.',
  },
  de: {
    title: 'EuroComply Workspace erstellen',
    subtitle: 'Organisieren Sie Dokumente, Lieferanten, Risiken und Compliance-Aufgaben sicher an einem Ort.',
    google: 'Mit Google fortfahren',
    separator: 'oder',
    name: 'Vollständiger Name',
    company: 'Unternehmen',
    email: 'E-Mail',
    password: 'Passwort',
    submit: 'Konto erstellen',
    login: 'Schon ein Konto? Anmelden',
    successTitle: 'Konto erstellt',
    successSubtitle: 'Bestätigen Sie Ihr Konto per E-Mail und melden Sie sich anschließend an.',
    errorTitle: 'Konto konnte nicht erstellt werden',
    selectedPlan: 'Ausgewählter Plan',
    planHelp: 'Dieser Plan wird bei der Registrierung gespeichert, damit Checkout/Onboarding korrekt fortgesetzt werden kann.',
  },
};

function getDashboardHref(locale: string, planId?: string) {
  const baseHref = `/${locale}/dashboard/organizations`;
  return planId ? `${baseHref}?plan=${encodeURIComponent(planId)}` : baseHref;
}

function normalizePlanId(planId: string | null) {
  return getBillingPlan(planId ?? '')?.id ?? 'growth';
}

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'pt';
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = signupCopy[activeLocale] ?? signupCopy.en;
  const selectedPlanId = normalizePlanId(searchParams.get('plan'));
  const selectedPlan = useMemo(() => getBillingPlan(selectedPlanId) ?? BILLING_PLANS[1], [selectedPlanId]);
  const dashboardHref = getDashboardHref(activeLocale, selectedPlan.id);
  const googleSignupHref = `/auth/google?locale=${encodeURIComponent(activeLocale)}&next=${encodeURIComponent(dashboardHref)}`;
  const { user, signUpWithEmail, loading: authLoading } = useAuth();
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
      router.replace(dashboardHref);
    }
  }, [authLoading, activeLocale, dashboardHref, router, user]);

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    const result = await signUpWithEmail(email, password, {
      name,
      company_name: companyName,
      requested_plan: selectedPlan.id,
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
      <div className="fixed right-5 top-5 z-20">
        <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
      </div>

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

          <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-100">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">{copy.selectedPlan}</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{selectedPlan.name}</p>
              <p className="font-bold">€{selectedPlan.priceMonthly}/mo</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-blue-100/70">{copy.planHelp}</p>
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
            <Link
              href={googleSignupHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50"
            >
              {copy.google}
            </Link>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              {copy.separator}
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

            <Link href={`/${activeLocale}/login`} className="block text-center text-sm text-white/50 hover:text-white">
              {copy.login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
