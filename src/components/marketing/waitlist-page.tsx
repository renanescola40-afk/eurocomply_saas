'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

const LAUNCH_TARGET_ISO = '2026-08-01T07:00:00+01:00';
const LAUNCH_TARGET_LABEL = '1 August 2026 · 07:00 Europe/Lisbon';
const COMMERCIAL_EMAIL = 'comercial@risckcomply.com';

type WaitlistCopy = {
  nav: { platform: string; features: string; access: string; cta: string };
  badge: string;
  title: string;
  subtitle: string;
  launchLabel: string;
  countdown: { days: string; hours: string; minutes: string; seconds: string; live: string };
  checklistEyebrow: string;
  checklistTitle: string;
  checklistSubtitle: string;
  form: {
    title: string;
    subtitle: string;
    company: string;
    email: string;
    role: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    privacy: string;
    contact: string;
  };
  proof: string[];
  features: { title: string; text: string; icon: typeof ShieldCheck }[];
};

function feature(title: string, text: string, icon: typeof ShieldCheck) {
  return { title, text, icon };
}

const en: WaitlistCopy = {
  nav: { platform: 'Platform', features: 'Launch checklist', access: 'Early access', cta: 'Join waitlist' },
  badge: 'Enterprise SaaS access opens soon for serious AI governance teams',
  title: 'RISCK COMPLY is not open yet. Join the enterprise waitlist.',
  subtitle:
    'We are preparing a controlled enterprise SaaS launch for companies that need AI inventory, EU AI Act readiness, governance evidence, audit trails and buyer-ready compliance workflows without unsafe legal promises.',
  launchLabel: LAUNCH_TARGET_LABEL,
  countdown: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', live: 'Available in' },
  checklistEyebrow: 'Launch scope',
  checklistTitle: 'What companies will get inside the SaaS',
  checklistSubtitle:
    'The first release is focused on practical governance: structure your AI usage, understand risk, create evidence and prepare for serious B2B buyers.',
  form: {
    title: 'Enter the waitlist',
    subtitle: 'Add your company details and we will contact priority leads when access opens.',
    company: 'Company name',
    email: 'Work email',
    role: 'Your role',
    submit: 'Join waitlist',
    submitting: 'Saving your priority place...',
    success: 'You are officially on the Risck Comply waitlist — and you are special. We saved your priority place and will contact qualified leads as early access opens.',
    error: 'Could not confirm your place right now. You can also contact us directly at comercial@risckcomply.com.',
    privacy: 'No passwords. No public signup. Only launch communication and early access qualification.',
    contact: 'Questions or want to speak with our team? Email us at',
  },
  proof: ['EU AI Act readiness', 'AI inventory', 'risk classification', 'evidence packs', 'audit trail', 'policies'],
  features: [
    feature('AI inventory', 'Register systems, use cases, owners, departments, providers, countries and data context in one workspace.', Database),
    feature('Risk classification', 'Structure AI Act readiness signals into risk levels, owners, review status and follow-up actions.', Scale),
    feature('Evidence packs', 'Generate buyer-ready summaries, documents and compliance evidence connected to the AI inventory.', ClipboardCheck),
    feature('Policy generator', 'Create internal AI usage policies, employee guidance and governance documents from controlled inputs.', FileText),
    feature('Team governance', 'Invite owners, assign responsibilities, track tasks and keep the organization aligned before audits.', Users),
    feature('Audit trail', 'Keep review history, evidence updates and governance activity traceable for security-conscious buyers.', ShieldCheck),
  ],
};

const pt: WaitlistCopy = {
  ...en,
  nav: { platform: 'Plataforma', features: 'Checklist', access: 'Early access', cta: 'Entrar na lista' },
  badge: 'Acesso ao SaaS enterprise abre em breve para equipas sérias de governança de IA',
  title: 'RISCK COMPLY ainda não está aberto. Entre na lista de espera enterprise.',
  subtitle:
    'Estamos a preparar o lançamento controlado de um SaaS enterprise para empresas que precisam de inventário de IA, EU AI Act readiness, evidência de governança, audit trail e workflows de compliance prontos para compradores B2B — sem promessas jurídicas inseguras.',
  launchLabel: '1 de agosto de 2026 · 07:00 Europe/Lisbon',
  countdown: { days: 'Dias', hours: 'Horas', minutes: 'Minutos', seconds: 'Segundos', live: 'Disponível em' },
  checklistEyebrow: 'Escopo do lançamento',
  checklistTitle: 'Tudo o que o SaaS vai oferecer às empresas',
  checklistSubtitle:
    'A primeira versão será focada em governança prática: organizar uso de IA, entender risco, criar evidências e preparar a empresa para compradores B2B sérios.',
  form: {
    title: 'Entre na lista de espera',
    subtitle: 'Adicione os dados da empresa e vamos contactar os leads prioritários quando o acesso abrir.',
    company: 'Nome da empresa',
    email: 'Email profissional',
    role: 'Cargo da pessoa',
    submit: 'Entrar na lista de espera',
    submitting: 'A guardar o seu lugar prioritário...',
    success: 'Você está oficialmente inscrito na lista de espera da Risck Comply — e você é especial. Guardámos o seu lugar prioritário e vamos contactar leads qualificados quando o acesso abrir.',
    error: 'Não foi possível confirmar o seu lugar agora. Você também pode falar connosco diretamente em comercial@risckcomply.com.',
    privacy: 'Sem senhas. Sem signup público. Apenas comunicação de lançamento e qualificação para early access.',
    contact: 'Dúvidas ou quer falar com a nossa equipa? Envie email para',
  },
  proof: ['EU AI Act readiness', 'inventário de IA', 'classificação de risco', 'evidence packs', 'audit trail', 'políticas'],
  features: [
    feature('Inventário de IA', 'Registe sistemas, casos de uso, owners, departamentos, fornecedores, países e contexto de dados num workspace.', Database),
    feature('Classificação de risco', 'Transforme sinais de AI Act readiness em níveis de risco, owners, estado de revisão e próximas ações.', Scale),
    feature('Evidence packs', 'Gere resumos, documentos e evidências de compliance ligados ao inventário de IA.', ClipboardCheck),
    feature('Gerador de políticas', 'Crie políticas internas de uso de IA, guias para colaboradores e documentos de governança com inputs controlados.', FileText),
    feature('Governança de equipa', 'Convide responsáveis, atribua tarefas e mantenha a organização alinhada antes de auditorias.', Users),
    feature('Audit trail', 'Mantenha histórico de revisão, atualização de evidências e atividade de governança rastreável para compradores exigentes.', ShieldCheck),
  ],
};

const waitlistCopy: Record<Locale, WaitlistCopy> = {
  en,
  pt,
  es: en,
  fr: en,
  it: en,
  de: en,
};

type Remaining = { days: string; hours: string; minutes: string; seconds: string };
type WaitlistSubmitStatus = 'idle' | 'submitting' | 'success' | 'warning' | 'error';
type WaitlistApiResponse = { emailed?: boolean; emailStatus?: string; emailAttempts?: number; error?: string };

function calculateRemaining(): Remaining {
  const diff = Math.max(0, new Date(LAUNCH_TARGET_ISO).getTime() - Date.now());
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

function emailWarningMessage(locale: Locale, payload: WaitlistApiResponse | null) {
  const status = payload?.emailStatus ? ` (${payload.emailStatus})` : '';
  if (locale === 'pt') {
    return `O seu lugar foi guardado, mas o email automático de confirmação ainda não saiu${status}. Pode falar connosco diretamente em ${COMMERCIAL_EMAIL}.`;
  }

  return `Your place was saved, but the automatic confirmation email was not delivered yet${status}. You can contact us directly at ${COMMERCIAL_EMAIL}.`;
}

function WaitlistCountdown({ copy }: { copy: WaitlistCopy }) {
  const empty = useMemo(() => ({ days: '--', hours: '--', minutes: '--', seconds: '--' }), []);
  const [remaining, setRemaining] = useState<Remaining>(empty);

  useEffect(() => {
    setRemaining(calculateRemaining());
    const interval = window.setInterval(() => setRemaining(calculateRemaining()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    [copy.countdown.days, remaining.days],
    [copy.countdown.hours, remaining.hours],
    [copy.countdown.minutes, remaining.minutes],
    [copy.countdown.seconds, remaining.seconds],
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/70">
        <Clock3 className="h-4 w-4" /> {copy.countdown.live}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2" aria-live="polite">
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
    </div>
  );
}

function WaitlistForm({ activeLocale, copy }: { activeLocale: Locale; copy: WaitlistCopy }) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<WaitlistSubmitStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    try {
      const response = await fetch('/api/prelaunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, email, role, locale: activeLocale, website }),
      });
      const payload = await response.json().catch(() => null) as WaitlistApiResponse | null;

      if (!response.ok) {
        setMessage(payload?.error || copy.form.error);
        setStatus('error');
        return;
      }

      if (payload?.emailed === false) {
        setMessage(emailWarningMessage(activeLocale, payload));
        setStatus('warning');
      } else {
        setMessage(copy.form.success);
        setStatus('success');
      }

      setCompanyName('');
      setEmail('');
      setRole('');
      setWebsite('');
    } catch {
      setMessage(copy.form.error);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl" id="waitlist-form">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/65">Early access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{copy.form.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">{copy.form.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-50">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-white/70">
          {copy.form.company}
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required minLength={2} maxLength={120} autoComplete="organization" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70" placeholder="Acme Europe" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.email}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70" placeholder="you@company.com" />
        </label>
        <label className="block text-sm font-medium text-white/70">
          {copy.form.role}
          <input value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={90} autoComplete="organization-title" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/70" placeholder="Founder, CTO, Compliance Officer" />
        </label>
        <label className="hidden" aria-hidden="true">
          Website
          <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status === 'success' ? <p className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-50" role="status">{message || copy.form.success}</p> : null}
      {status === 'warning' ? <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-50" role="status">{message}</p> : null}
      {status === 'error' ? <p className="mt-5 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-50" role="alert">{message || copy.form.error}</p> : null}

      <button type="submit" disabled={status === 'submitting'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
        {status === 'submitting' ? copy.form.submitting : copy.form.submit}
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-4 text-xs leading-5 text-white/38">{copy.form.privacy}</p>
      <p className="mt-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-50/78">
        {copy.form.contact}{' '}
        <a href={`mailto:${COMMERCIAL_EMAIL}`} className="font-semibold text-white underline decoration-cyan-200/40 underline-offset-4 hover:text-cyan-100">
          {COMMERCIAL_EMAIL}
        </a>
      </p>
    </form>
  );
}

export function WaitlistPage({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = waitlistCopy[activeLocale] ?? waitlistCopy.en;
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(14,165,233,.28),transparent_30rem),radial-gradient(circle_at_82%_12%,rgba(16,185,129,.16),transparent_29rem),radial-gradient(circle_at_50%_80%,rgba(59,130,246,.14),transparent_36rem),linear-gradient(180deg,#050505_0%,#071018_48%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/75 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto object-contain" priority />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/58 lg:flex">
            <a href="#platform" className="transition hover:text-white">{copy.nav.platform}</a>
            <a href="#features" className="transition hover:text-white">{copy.nav.features}</a>
            <a href="#waitlist-form" className="transition hover:text-white">{copy.nav.access}</a>
            <span className="text-white/32">{localeName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
            <a href="#waitlist-form" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:bg-zinc-200">{copy.nav.cta}</a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/82">
              <LockKeyhole className="h-4 w-4" /> {copy.badge}
            </div>
            <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.067em] text-white sm:text-6xl lg:text-7xl">{copy.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/66 sm:text-xl">{copy.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {copy.proof.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/52">{item}</span>)}
            </div>
          </div>
          <div className="space-y-4">
            <WaitlistCountdown copy={copy} />
            <div className="rounded-[2rem] border border-cyan-200/15 bg-cyan-300/[0.06] p-5">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-cyan-50" />
                <p className="text-sm leading-6 text-white/66">Priority access is for companies, founders, CTOs, compliance officers and security-conscious B2B buyers preparing AI governance before procurement pressure arrives.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/55">{copy.checklistEyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">{copy.checklistTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-white/58">{copy.checklistSubtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.features.map(({ title, text, icon: Icon }) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                <Icon className="h-5 w-5 text-cyan-100" />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
          <WaitlistForm activeLocale={activeLocale} copy={copy} />
          <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-emerald-50">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100/72">Controlled launch</p>
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white">No generic signup. No fake enterprise claims.</h2>
            <p className="mt-5 text-base leading-8 text-white/58">
              Risck Comply is being prepared as a serious B2B SaaS. The waitlist lets us qualify teams, validate demand and open access without pretending the product replaces legal counsel or certified auditors.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Evidence-first workflows', 'Buyer-ready positioning', 'Security-conscious release', 'Early access qualification'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white/68">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <PublicFooter locale={activeLocale} />
    </main>
  );
}
