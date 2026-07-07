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
    <section className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl" aria-label={copy.countdown.live}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/70">
        <Clock3 className="h-4 w-4" aria-hidden="true" /> {copy.countdown.live}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2" aria-live="polite" aria-atomic="true">
        {units.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
            <p className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{value}</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-3 text-sm font-medium text-emerald-50/80">
        {copy.launchLabel}
      </p>
    </section>
  );
}

export function WaitlistForm({ activeLocale, copy, commercialEmail }: { activeLocale: Locale; copy: WaitlistInteractionCopy; commercialEmail: string }) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<WaitlistSubmitStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const feedbackId = 'waitlist-feedback';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/prelaunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, email, role, locale: activeLocale, consentToContact: true }),
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
    } catch {
      setMessage(copy.form.error);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl" id="waitlist-form" aria-describedby={message ? feedbackId : undefined} aria-busy={status === 'submitting'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/65">Early access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{copy.form.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">{copy.form.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-50">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-white/70">
          {copy.form.company}
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required minLength={2} maxLength={120} autoComplete="organization" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70 focus-visible:ring-2 focus-visible:ring-cyan-200/70" placeholder="Acme Europe" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.email}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70 focus-visible:ring-2 focus-visible:ring-cyan-200/70" placeholder="you@company.com" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.role}
          <input value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={90} autoComplete="organization-title" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70 focus-visible:ring-2 focus-visible:ring-cyan-200/70" placeholder="Founder, CTO, Compliance Officer" />
        </label>
      </div>

      {status === 'success' ? <p id={feedbackId} className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-50" role="status">{message || copy.form.success}</p> : null}
      {status === 'warning' ? <p id={feedbackId} className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-50" role="status">{message}</p> : null}
      {status === 'error' ? <p id={feedbackId} className="mt-5 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-50" role="alert">{message || copy.form.error}</p> : null}

      <button type="submit" disabled={status === 'submitting'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60">
        {status === 'submitting' ? copy.form.submitting : copy.form.submit}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-4 text-xs leading-5 text-white/38">{copy.form.privacy}</p>
      <p className="mt-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-50/78">
        {copy.form.contact}{' '}
        <a href={`mailto:${commercialEmail}`} className="font-semibold text-white underline decoration-cyan-200/40 underline-offset-4 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
          {commercialEmail}
        </a>
      </p>
    </form>
  );
}
