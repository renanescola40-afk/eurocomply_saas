'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';

import { resolveWaitlistSubmitFeedback } from '@/components/marketing/waitlist-state';
import type { Locale } from '@/lib/i18n/routing';

export type WaitlistInteractionCopy = {
  launchLabel: string;
  countdown: { days: string; hours: string; minutes: string; seconds: string; live: string };
  form: {
    title: string;
    subtitle: string;
    company: string;
    email: string;
    role: string;
    submit: string;
    submitting: string;
    success: string;
    emailSuccess: string;
    error: string;
    privacy: string;
    contact: string;
  };
};

type Remaining = { days: string; hours: string; minutes: string; seconds: string };
type WaitlistSubmitStatus = 'idle' | 'submitting' | 'success' | 'warning' | 'error';
type WaitlistApiResponse = { emailed?: boolean; emailStatus?: string; error?: string };

const consentLabels: Record<Locale, string> = {
  en: 'I authorize contact about the RISCK COMPLY launch.',
  pt: 'Autorizo o contacto sobre o lançamento do RISCK COMPLY.',
  es: 'Autorizo el contacto sobre el lanzamiento de RISCK COMPLY.',
  fr: 'J’autorise RISCK COMPLY à me contacter au sujet de son lancement.',
  it: 'Autorizzo il contatto in merito al lancio di RISCK COMPLY.',
  de: 'Ich stimme einer Kontaktaufnahme zum Start von RISCK COMPLY zu.',
};

function calculateRemaining(launchTargetIso: string): Remaining {
  const diff = Math.max(0, new Date(launchTargetIso).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

function emailWarningMessage(locale: Locale, payload: WaitlistApiResponse | null, contactEmail: string) {
  const status = payload?.emailStatus ? ` (${payload.emailStatus})` : '';
  if (locale === 'pt') return `O seu lugar foi guardado, mas ainda nao recebemos confirmacao automatica de envio do email${status}. Pode falar connosco diretamente em ${contactEmail}.`;
  return `Your place was saved, but we do not yet have automatic confirmation that the email was delivered${status}. You can contact us directly at ${contactEmail}.`;
}

export function WaitlistCountdown({ copy, launchTargetIso }: { copy: WaitlistInteractionCopy; launchTargetIso: string }) {
  const empty = useMemo(() => ({ days: '--', hours: '--', minutes: '--', seconds: '--' }), []);
  const [remaining, setRemaining] = useState<Remaining>(empty);

  useEffect(() => {
    setRemaining(calculateRemaining(launchTargetIso));
    const interval = window.setInterval(() => setRemaining(calculateRemaining(launchTargetIso)), 1000);
    return () => window.clearInterval(interval);
  }, [launchTargetIso]);

  const units = [
    [copy.countdown.days, remaining.days],
    [copy.countdown.hours, remaining.hours],
    [copy.countdown.minutes, remaining.minutes],
    [copy.countdown.seconds, remaining.seconds],
  ];

  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-5" aria-label={copy.countdown.live}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-blue-300/70">
        <Clock3 className="h-4 w-4" aria-hidden="true" /> {copy.countdown.live}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2" aria-live="polite" aria-atomic="true">
        {units.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/25 p-3 text-center">
            <p className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{value}</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-blue-400/20 bg-blue-500/[0.08] px-4 py-3 text-sm font-medium text-blue-100">
        {copy.launchLabel}
      </p>
    </section>
  );
}

export function WaitlistForm({ activeLocale, copy, commercialEmail }: { activeLocale: Locale; copy: WaitlistInteractionCopy; commercialEmail: string }) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [consentToContact, setConsentToContact] = useState(false);
  const [status, setStatus] = useState<WaitlistSubmitStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const feedbackId = 'waitlist-feedback';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consentToContact) {
      return;
    }

    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/prelaunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, email, role, website, locale: activeLocale, consentToContact }),
      });
      const payload = (await response.json().catch(() => null)) as WaitlistApiResponse | null;

      if (!response.ok) {
        setMessage(payload?.error || copy.form.error);
        setStatus('error');
        return;
      }

      const feedback = resolveWaitlistSubmitFeedback({
        signal: payload?.emailed,
        successMessage: copy.form.success,
        confirmedMessage: copy.form.emailSuccess,
        warningMessage: emailWarningMessage(activeLocale, payload, commercialEmail),
      });

      setMessage(feedback.message);
      setStatus(feedback.status);
      setCompanyName('');
      setEmail('');
      setRole('');
      setWebsite('');
      setConsentToContact(false);
    } catch {
      setMessage(copy.form.error);
      setStatus('error');
    }
  }

  const inputClassName = 'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/35 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-blue-400/70 focus-visible:ring-2 focus-visible:ring-blue-400/70';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-6" id="waitlist-form" aria-describedby={message ? feedbackId : undefined} aria-busy={status === 'submitting'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/70">Early access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{copy.form.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">{copy.form.subtitle}</p>
        </div>
        <div className="rounded-lg border border-violet-400/20 bg-violet-500/10 p-3 text-violet-200">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-white/70">
          {copy.form.company}
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required minLength={2} maxLength={120} autoComplete="organization" className={inputClassName} placeholder="Acme Europe" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.email}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" className={inputClassName} placeholder="you@company.com" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.role}
          <input value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={90} autoComplete="organization-title" className={inputClassName} placeholder="Founder, CTO, Compliance Officer" />
        </label>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="waitlist-website">Website</label>
          <input id="waitlist-website" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} />
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-slate-700/80 bg-slate-950/25 p-4 text-sm leading-6 text-white/65">
          <input
            type="checkbox"
            name="consentToContact"
            required
            checked={consentToContact}
            onChange={(event) => setConsentToContact(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950 text-blue-600 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522]"
          />
          <span>{consentLabels[activeLocale]}</span>
        </label>
      </div>

      {status === 'success' ? <p id={feedbackId} className="mt-5 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-50" role="status">{message || copy.form.success}</p> : null}
      {status === 'warning' ? <p id={feedbackId} className="mt-5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-50" role="status">{message}</p> : null}
      {status === 'error' ? <p id={feedbackId} className="mt-5 rounded-lg border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-50" role="alert">{message || copy.form.error}</p> : null}

      <button type="submit" disabled={status === 'submitting'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522] disabled:cursor-not-allowed disabled:opacity-60">
        {status === 'submitting' ? copy.form.submitting : copy.form.submit}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-4 text-xs leading-5 text-white/38">{copy.form.privacy}</p>
      <p className="mt-3 rounded-lg border border-blue-400/15 bg-blue-500/[0.06] px-4 py-3 text-xs leading-5 text-blue-100/80">
        {copy.form.contact}{' '}
        <a href={`mailto:${commercialEmail}`} className="font-semibold text-white underline decoration-blue-400/40 underline-offset-4 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522]">
          {commercialEmail}
        </a>
      </p>
    </form>
  );
}
