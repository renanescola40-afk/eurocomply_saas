'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { locales, type Locale } from '@/lib/i18n/routing';

const copy = {
  en: {
    eyebrow: 'SECURE ACCOUNT RECOVERY',
    title: 'Recover your account',
    subtitle: 'Enter your work email. We will send recovery instructions when an account is eligible.',
    email: 'Work email',
    submit: 'Send recovery link',
    submitting: 'Sending securely…',
    success: 'If an account exists for that email, a secure recovery link will be sent.',
    unavailable: 'Account recovery is temporarily unavailable. Please try again later.',
    invalid: 'Enter a valid work email.',
    back: 'Back to sign in',
  },
  pt: {
    eyebrow: 'RECUPERAÇÃO SEGURA DE CONTA',
    title: 'Recupere a sua conta',
    subtitle: 'Informe o seu email profissional. Enviaremos instruções quando uma conta estiver elegível.',
    email: 'Email profissional',
    submit: 'Enviar link de recuperação',
    submitting: 'A enviar com segurança…',
    success: 'Se existir uma conta para esse email, será enviado um link seguro de recuperação.',
    unavailable: 'A recuperação de conta está temporariamente indisponível. Tente novamente mais tarde.',
    invalid: 'Informe um email profissional válido.',
    back: 'Voltar ao login',
  },
  es: {
    eyebrow: 'RECUPERACIÓN SEGURA DE CUENTA',
    title: 'Recupera tu cuenta',
    subtitle: 'Introduce tu correo de trabajo. Enviaremos instrucciones cuando una cuenta sea elegible.',
    email: 'Correo de trabajo',
    submit: 'Enviar enlace de recuperación',
    submitting: 'Enviando de forma segura…',
    success: 'Si existe una cuenta para ese correo, se enviará un enlace seguro de recuperación.',
    unavailable: 'La recuperación de cuenta no está disponible temporalmente. Inténtalo más tarde.',
    invalid: 'Introduce un correo de trabajo válido.',
    back: 'Volver al inicio de sesión',
  },
  fr: {
    eyebrow: 'RÉCUPÉRATION SÉCURISÉE DU COMPTE',
    title: 'Récupérez votre compte',
    subtitle: 'Saisissez votre e-mail professionnel. Des instructions seront envoyées si le compte est éligible.',
    email: 'E-mail professionnel',
    submit: 'Envoyer le lien de récupération',
    submitting: 'Envoi sécurisé…',
    success: 'Si un compte existe pour cet e-mail, un lien de récupération sécurisé sera envoyé.',
    unavailable: 'La récupération du compte est temporairement indisponible. Réessayez plus tard.',
    invalid: 'Saisissez un e-mail professionnel valide.',
    back: 'Retour à la connexion',
  },
  it: {
    eyebrow: 'RECUPERO SICURO DELL’ACCOUNT',
    title: 'Recupera il tuo account',
    subtitle: 'Inserisci l’e-mail di lavoro. Invieremo le istruzioni quando un account è idoneo.',
    email: 'E-mail di lavoro',
    submit: 'Invia link di recupero',
    submitting: 'Invio sicuro…',
    success: 'Se esiste un account per questa e-mail, verrà inviato un link di recupero sicuro.',
    unavailable: 'Il recupero dell’account è temporaneamente non disponibile. Riprova più tardi.',
    invalid: 'Inserisci un’e-mail di lavoro valida.',
    back: 'Torna al login',
  },
  de: {
    eyebrow: 'SICHERE KONTOWIEDERHERSTELLUNG',
    title: 'Konto wiederherstellen',
    subtitle: 'Geben Sie Ihre geschäftliche E-Mail-Adresse ein. Bei einem berechtigten Konto senden wir Anweisungen.',
    email: 'Geschäftliche E-Mail',
    submit: 'Wiederherstellungslink senden',
    submitting: 'Wird sicher gesendet…',
    success: 'Falls ein Konto für diese E-Mail existiert, wird ein sicherer Wiederherstellungslink gesendet.',
    unavailable: 'Die Kontowiederherstellung ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
    invalid: 'Geben Sie eine gültige geschäftliche E-Mail-Adresse ein.',
    back: 'Zurück zur Anmeldung',
  },
} as const;

function activeLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : 'en';
}

export default function AccountRecoveryPage() {
  const params = useParams<{ locale: string }>();
  const locale = activeLocale(params?.locale);
  const text = copy[locale];
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || busy) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNotice({ tone: 'error', message: text.invalid });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const response = await fetch('/api/auth/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email: normalizedEmail, locale }),
      });

      if (!response.ok) {
        setNotice({ tone: 'error', message: text.unavailable });
        return;
      }

      setNotice({ tone: 'success', message: text.success });
      setEmail('');
    } catch {
      setNotice({ tone: 'error', message: text.unavailable });
    } finally {
      setBusy(false);
    }
  }

  const formDisabled = !hydrated || busy;

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.16),transparent_34rem),radial-gradient(circle_at_bottom_right,rgba(124,58,237,.10),transparent_30rem)]" />
      <div className="relative mx-auto flex min-h-screen max-w-lg items-center px-5 py-10">
        <section className="w-full rounded-[1.75rem] border border-white/[0.09] bg-[#0a1320]/92 p-7 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
          <Link href={`/${locale}`} aria-label="RISCK COMPLY" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={164} height={32} priority className="h-6 w-auto" />
          </Link>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/60">{text.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">{text.subtitle}</p>

          {notice ? (
            <div
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm leading-6 ${notice.tone === 'success' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-red-400/25 bg-red-500/10 text-red-100'}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {notice.message}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={submitRecovery} aria-busy={busy}>
            <label className="block text-sm font-medium text-white/72">
              {text.email}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                disabled={formDisabled}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/50 focus-visible:ring-2 focus-visible:ring-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="you@company.com"
              />
            </label>
            <button
              type="submit"
              disabled={formDisabled}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? text.submitting : text.submit}
            </button>
          </form>

          <Link href={`/${locale}/login`} className="mt-6 flex justify-center rounded-md text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70">
            {text.back}
          </Link>
        </section>
      </div>
    </main>
  );
}