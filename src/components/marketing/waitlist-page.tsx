import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { WaitlistCountdown, WaitlistForm, type WaitlistInteractionCopy } from '@/components/marketing/waitlist-interactions';
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
  audienceNote: string;
  gateTitle: string;
  gateText: string;
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
  proof: string[];
  features: { title: string; text: string; icon: typeof ShieldCheck }[];
};

function feature(title: string, text: string, icon: typeof ShieldCheck) {
  return { title, text, icon };
}

const en: WaitlistCopy = {
  nav: { platform: 'Platform', features: 'Launch checklist', access: 'Early access', cta: 'Join waitlist' },
  badge: 'Controlled SaaS access opens soon for serious AI governance teams',
  title: 'Prepare AI Act readiness without unsafe legal promises.',
  subtitle:
    'RISCK COMPLY helps European teams organize AI inventory, risk visibility, governance workflows, audit trails and evidence preparation for internal review, security review and B2B procurement conversations. It does not replace legal counsel or guarantee compliance outcomes.',
  launchLabel: LAUNCH_TARGET_LABEL,
  countdown: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', live: 'Available in' },
  checklistEyebrow: 'Launch scope',
  checklistTitle: 'What teams can organize inside the SaaS',
  checklistSubtitle:
    'The first release focuses on practical compliance operations: structure AI usage, assign ownership, understand risk signals, prepare documentation and keep evidence reviewable.',
  audienceNote:
    'Priority access is for founders, CTOs, compliance officers, security teams and B2B operators preparing AI governance before customer, investor or procurement pressure arrives.',
  gateTitle: 'No open signup until the controlled launch gate opens.',
  gateText: 'For now, public login, signup, checkout and demo CTAs send companies here so RISCK COMPLY can qualify demand before release.',
  form: {
    title: 'Enter the waitlist',
    subtitle: 'Add your company details and we will contact qualified leads when early access opens.',
    company: 'Company name',
    email: 'Work email',
    role: 'Your role',
    submit: 'Join waitlist',
    submitting: 'Saving your place...',
    success: 'You are on the RISCK COMPLY waitlist. We saved your place and will contact qualified leads as early access opens.',
    emailSuccess: 'You are on the RISCK COMPLY waitlist. We saved your place and sent a confirmation email with your join date, launch date and remaining time.',
    error: 'Could not confirm your place right now. You can also contact us directly at comercial@risckcomply.com.',
    privacy: 'No passwords. No public signup. Only launch communication and early access qualification.',
    contact: 'Questions or want to speak with our team? Email us at',
  },
  proof: ['AI Act readiness', 'AI inventory', 'risk visibility', 'evidence preparation', 'audit trail', 'governance workflows'],
  features: [
    feature('AI inventory', 'Register systems, use cases, owners, departments, providers, countries and data context in one workspace.', Database),
    feature('Risk visibility', 'Structure readiness signals into risk levels, owners, review status and follow-up actions.', Scale),
    feature('Evidence preparation', 'Create reviewable summaries, documents and governance evidence connected to the AI inventory.', ClipboardCheck),
    feature('Policy workflows', 'Draft internal AI usage policies, employee guidance and governance documents from controlled inputs.', FileText),
    feature('Team governance', 'Invite owners, assign responsibilities, track tasks and keep the organization aligned before reviews.', Users),
    feature('Audit trail', 'Keep review history, evidence updates and governance activity traceable for security-conscious buyers.', ShieldCheck),
  ],
};

const pt: WaitlistCopy = {
  ...en,
  nav: { platform: 'Plataforma', features: 'Checklist', access: 'Early access', cta: 'Entrar na lista' },
  badge: 'Acesso controlado ao SaaS abre em breve para equipas serias de governanca de IA',
  title: 'Prepare AI Act readiness sem promessas juridicas inseguras.',
  subtitle:
    'RISCK COMPLY ajuda equipas europeias a organizar inventario de IA, visibilidade de risco, workflows de governanca, audit trail e preparacao de evidencias para revisao interna, security review e conversas de procurement B2B. Nao substitui aconselhamento juridico nem garante resultados de compliance.',
  launchLabel: '1 de agosto de 2026 · 07:00 Europe/Lisbon',
  countdown: { days: 'Dias', hours: 'Horas', minutes: 'Minutos', seconds: 'Segundos', live: 'Disponivel em' },
  checklistEyebrow: 'Escopo do lancamento',
  checklistTitle: 'O que as equipas podem organizar no SaaS',
  checklistSubtitle:
    'A primeira versao foca operacoes praticas de compliance: estruturar uso de IA, atribuir responsaveis, entender sinais de risco, preparar documentacao e manter evidencias revisaveis.',
  audienceNote:
    'Acesso prioritario e para founders, CTOs, compliance officers, equipas de seguranca e operadores B2B que estao a preparar governanca de IA antes da pressao de clientes, investidores ou procurement.',
  gateTitle: 'Sem signup publico ate a abertura controlada do lancamento.',
  gateText: 'Por agora, CTAs publicos de login, signup, checkout e demo enviam empresas para esta lista para a RISCK COMPLY qualificar a procura antes do release.',
  form: {
    title: 'Entre na lista de espera',
    subtitle: 'Adicione os dados da empresa e vamos contactar leads qualificados quando o early access abrir.',
    company: 'Nome da empresa',
    email: 'Email profissional',
    role: 'Cargo da pessoa',
    submit: 'Entrar na lista de espera',
    submitting: 'A guardar o seu lugar...',
    success: 'Voce esta na lista de espera da RISCK COMPLY. Guardamos o seu lugar e vamos contactar leads qualificados quando o early access abrir.',
    emailSuccess: 'Voce esta na lista de espera da RISCK COMPLY. Guardamos o seu lugar e enviamos um email com o dia da inscricao, a data de abertura e o tempo que falta.',
    error: 'Nao foi possivel confirmar o seu lugar agora. Voce tambem pode falar connosco diretamente em comercial@risckcomply.com.',
    privacy: 'Sem senhas. Sem signup publico. Apenas comunicacao de lancamento e qualificacao para early access.',
    contact: 'Duvidas ou quer falar com a nossa equipa? Envie email para',
  },
  proof: ['AI Act readiness', 'inventario de IA', 'visibilidade de risco', 'preparacao de evidencias', 'audit trail', 'workflows de governanca'],
  features: [
    feature('Inventario de IA', 'Registe sistemas, casos de uso, owners, departamentos, fornecedores, paises e contexto de dados num workspace.', Database),
    feature('Visibilidade de risco', 'Estruture sinais de readiness em niveis de risco, owners, estado de revisao e proximas acoes.', Scale),
    feature('Preparacao de evidencias', 'Crie resumos, documentos e evidencias de governanca revisaveis ligados ao inventario de IA.', ClipboardCheck),
    feature('Workflows de politicas', 'Rascunhe politicas internas de uso de IA, guias para colaboradores e documentos de governanca com inputs controlados.', FileText),
    feature('Governanca de equipa', 'Convide responsaveis, atribua tarefas e mantenha a organizacao alinhada antes de revisoes.', Users),
    feature('Audit trail', 'Mantenha historico de revisao, atualizacao de evidencias e atividade de governanca rastreavel para compradores exigentes.', ShieldCheck),
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

export function WaitlistPage({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = waitlistCopy[activeLocale] ?? waitlistCopy.en;
  const meta = LOCALE_META[activeLocale];
  const localeName = meta.nativeName ?? meta.name;
  const interactionCopy = {
    countdown: copy.countdown,
    launchLabel: copy.launchLabel,
    form: copy.form,
  } satisfies WaitlistInteractionCopy;

  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(14,165,233,.28),transparent_30rem),radial-gradient(circle_at_82%_12%,rgba(16,185,129,.16),transparent_29rem),radial-gradient(circle_at_50%_80%,rgba(59,130,246,.14),transparent_36rem),linear-gradient(180deg,#050505_0%,#071018_48%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/75 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <Link href={`/${activeLocale}`} className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]" aria-label="RISCK COMPLY home">
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={180} height={44} className="h-10 w-auto object-contain" priority />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/58 lg:flex">
            <a href="#platform" className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">{copy.nav.platform}</a>
            <a href="#features" className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">{copy.nav.features}</a>
            <a href="#waitlist-form" className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">{copy.nav.access}</a>
            <span className="text-white/32">{localeName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
            <a href="#waitlist-form" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,.18)] transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">{copy.nav.cta}</a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pt-40" aria-labelledby="landing-title">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/82">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" /> {copy.badge}
            </div>
            <h1 id="landing-title" className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.067em] text-white sm:text-6xl lg:text-7xl">{copy.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/66 sm:text-xl">{copy.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2" aria-label="Product capabilities">
              {copy.proof.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/52">{item}</span>)}
            </div>
          </div>
          <div className="space-y-4">
            <WaitlistCountdown copy={interactionCopy} launchTargetIso={LAUNCH_TARGET_ISO} />
            <div className="rounded-[2rem] border border-cyan-200/15 bg-cyan-300/[0.06] p-5">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-cyan-50" aria-hidden="true" />
                <p className="text-sm leading-6 text-white/66">{copy.audienceNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 border-y border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="launch-scope-title">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/55">{copy.checklistEyebrow}</p>
            <h2 id="launch-scope-title" className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">{copy.checklistTitle}</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/56 md:text-base">{copy.checklistSubtitle}</p>
          </div>
          <div id="features" className="grid gap-4 md:grid-cols-2">
            {copy.features.map(({ title, text, icon: Icon }) => (
              <article key={title} className="rounded-[1.65rem] border border-white/10 bg-black/25 p-5 shadow-xl backdrop-blur">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/10 p-3 text-white"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="controlled-launch-title">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Controlled launch
            </div>
            <p id="controlled-launch-title" className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white">{copy.gateTitle}</p>
            <p className="mt-4 text-sm leading-7 text-white/54">{copy.gateText}</p>
          </div>
          <WaitlistForm activeLocale={activeLocale} copy={interactionCopy} commercialEmail={COMMERCIAL_EMAIL} />
        </div>
      </section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
