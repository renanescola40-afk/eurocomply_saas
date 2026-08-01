'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  Globe2,
  Layers3,
  LockKeyhole,
  Menu,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { LOCALE_META, locales, type Locale } from '@/lib/i18n/routing';

type IconType = typeof ShieldCheck;
type Feature = { title: string; description: string; icon: IconType };
type ControlView = {
  id: 'inventory' | 'risk' | 'evidence' | 'monitoring';
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  metrics: Array<{ value: string; label: string }>;
  rows: Array<{ name: string; meta: string; status: string }>;
};

type LandingCopy = {
  nav: {
    platform: string;
    workflows: string;
    security: string;
    pricing: string;
    login: string;
    signup: string;
  };
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trust: string[];
  audienceLabel: string;
  audiences: string[];
  sourceEyebrow: string;
  sourceTitle: string;
  sourceText: string;
  commandEyebrow: string;
  commandTitle: string;
  commandText: string;
  pathwaysEyebrow: string;
  pathwaysTitle: string;
  workflowEyebrow: string;
  workflowTitle: string;
  workflowText: string;
  securityEyebrow: string;
  securityTitle: string;
  securityText: string;
  finalTitle: string;
  finalText: string;
  features: Feature[];
  workflowSteps: string[];
  controlViews: ControlView[];
};

const feature = (title: string, description: string, icon: IconType): Feature => ({
  title,
  description,
  icon,
});

const en: LandingCopy = {
  nav: {
    platform: 'Platform',
    workflows: 'Workflows',
    security: 'Security',
    pricing: 'Pricing',
    login: 'Sign in',
    signup: 'Create account',
  },
  eyebrow: 'AI governance operations for European teams',
  title: 'Turn AI governance into evidence ready for review.',
  subtitle:
    'Bring AI inventory, risk assessments, evidence, policies, owners and activity history into one controlled workspace for compliance, security, legal and procurement teams.',
  primaryCta: 'Create account',
  secondaryCta: 'Explore the platform',
  trust: ['Organization workspaces', 'Role-based access', 'Activity history', 'Evidence workflows'],
  audienceLabel: 'Designed for the teams that operate trust',
  audiences: ['Compliance', 'Security', 'Legal', 'Procurement', 'Engineering', 'Executive'],
  sourceEyebrow: 'One operational source of truth',
  sourceTitle: 'See the complete governance picture, not another disconnected checklist.',
  sourceText:
    'Connect systems, owners, assessments, evidence and decisions in a workspace that stays understandable from first inventory to executive review.',
  commandEyebrow: 'Enterprise control plane',
  commandTitle: 'One command centre for every governance signal.',
  commandText:
    'Move between inventory, risk, evidence and monitoring without losing context, ownership or traceability.',
  pathwaysEyebrow: 'Built around accountable teams',
  pathwaysTitle: 'Give every stakeholder a clear path through the same operating model.',
  workflowEyebrow: 'From discovery to review',
  workflowTitle: 'A practical operating flow for AI governance.',
  workflowText:
    'Move every system through a clear path without turning governance into a maze of disconnected documents.',
  securityEyebrow: 'Controlled by design',
  securityTitle: 'A serious operating layer for access, evidence and review.',
  securityText:
    'RISCK COMPLY supports professional governance operations. It does not replace legal counsel or guarantee regulatory outcomes.',
  finalTitle: 'Build an AI governance operation people can actually run.',
  finalText:
    'Create your workspace and start organizing systems, responsibilities, risks and evidence in one place.',
  features: [
    feature('AI system inventory', 'Register systems, use cases, providers, departments, countries and data context.', Database),
    feature('Risk assessments', 'Capture risk signals, review status and structured assessment context.', Radar),
    feature('Evidence packs', 'Organize documents, decisions and supporting records for review.', ClipboardCheck),
    feature('Policies and documents', 'Prepare and maintain governance documentation in one workspace.', FileText),
    feature('Owners and tasks', 'Assign accountability and keep follow-up work visible across teams.', Users),
    feature('Activity history', 'Keep governance actions and evidence changes traceable over time.', ShieldCheck),
  ],
  workflowSteps: ['Discover', 'Register', 'Assess', 'Assign', 'Document', 'Review', 'Monitor'],
  controlViews: [
    {
      id: 'inventory',
      label: 'Inventory',
      eyebrow: 'System register',
      title: 'Know what AI exists across the organization.',
      description: 'Map providers, use cases, owners, locations, data context and review status in one live operating register.',
      metrics: [
        { value: '24', label: 'Systems' },
        { value: '06', label: 'Departments' },
        { value: '04', label: 'Countries' },
      ],
      rows: [
        { name: 'Support assistant', meta: 'Customer operations · Portugal', status: 'Mapped' },
        { name: 'Candidate screening', meta: 'People · Germany', status: 'Review' },
        { name: 'Document analysis', meta: 'Legal · France', status: 'Active' },
      ],
    },
    {
      id: 'risk',
      label: 'Risk',
      eyebrow: 'Assessment workspace',
      title: 'Turn scattered signals into reviewable risk context.',
      description: 'Keep classification, rationale, reviewer status and remediation work together instead of splitting them across files.',
      metrics: [
        { value: '08', label: 'In review' },
        { value: '03', label: 'High attention' },
        { value: '91%', label: 'Complete' },
      ],
      rows: [
        { name: 'Candidate screening', meta: 'Fundamental rights review', status: 'Priority' },
        { name: 'Fraud detection', meta: 'Human oversight check', status: 'Open' },
        { name: 'Support assistant', meta: 'Transparency review', status: 'Ready' },
      ],
    },
    {
      id: 'evidence',
      label: 'Evidence',
      eyebrow: 'Review packs',
      title: 'Prepare evidence without rebuilding the story every time.',
      description: 'Group decisions, policies, assessments, owners and supporting files into packs that are easier to review and hand over.',
      metrics: [
        { value: '17', label: 'Evidence items' },
        { value: '05', label: 'Policies' },
        { value: '12', label: 'Decisions' },
      ],
      rows: [
        { name: 'AI inventory pack', meta: 'Updated today', status: 'Ready' },
        { name: 'Risk governance policy', meta: 'Owner: Legal', status: 'Review' },
        { name: 'Vendor due diligence', meta: '6 attachments', status: 'Draft' },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      eyebrow: 'Continuous operations',
      title: 'Keep governance alive after the first assessment.',
      description: 'Surface changes, expiring reviews, unresolved actions and ownership gaps before they disappear into inboxes.',
      metrics: [
        { value: '07', label: 'Open actions' },
        { value: '02', label: 'Due soon' },
        { value: '00', label: 'Unassigned' },
      ],
      rows: [
        { name: 'Review candidate screening', meta: 'Due in 4 days', status: 'Due soon' },
        { name: 'Renew vendor evidence', meta: 'Owner: Procurement', status: 'Open' },
        { name: 'Confirm support disclosures', meta: 'Owner: Compliance', status: 'Tracked' },
      ],
    },
  ],
};

const pt: LandingCopy = {
  nav: {
    platform: 'Plataforma',
    workflows: 'Workflows',
    security: 'Segurança',
    pricing: 'Preços',
    login: 'Entrar',
    signup: 'Criar conta',
  },
  eyebrow: 'Operações de governança de IA para equipas europeias',
  title: 'Transforme governança de IA em evidência pronta para revisão.',
  subtitle:
    'Reúna inventário de IA, avaliações de risco, evidências, políticas, responsáveis e histórico de atividade num workspace controlado para equipas de compliance, segurança, jurídico e procurement.',
  primaryCta: 'Criar conta',
  secondaryCta: 'Explorar a plataforma',
  trust: ['Workspaces por organização', 'Controlo por função', 'Histórico de atividade', 'Workflows de evidência'],
  audienceLabel: 'Criado para as equipas que operam confiança',
  audiences: ['Compliance', 'Segurança', 'Jurídico', 'Procurement', 'Engenharia', 'Executivo'],
  sourceEyebrow: 'Uma fonte operacional de verdade',
  sourceTitle: 'Veja a operação completa, não apenas mais uma checklist desligada.',
  sourceText:
    'Ligue sistemas, responsáveis, avaliações, evidências e decisões num workspace compreensível desde o primeiro inventário até à revisão executiva.',
  commandEyebrow: 'Plano de controlo enterprise',
  commandTitle: 'Um centro de comando para cada sinal de governança.',
  commandText:
    'Alterne entre inventário, risco, evidências e monitorização sem perder contexto, responsabilidade ou rastreabilidade.',
  pathwaysEyebrow: 'Construído em torno de equipas responsáveis',
  pathwaysTitle: 'Dê a cada stakeholder um caminho claro dentro do mesmo modelo operacional.',
  workflowEyebrow: 'Da descoberta à revisão',
  workflowTitle: 'Um fluxo prático para operar governança de IA.',
  workflowText:
    'Conduza cada sistema por um processo claro sem transformar governança num labirinto de documentos desligados.',
  securityEyebrow: 'Controlo desde a base',
  securityTitle: 'Uma camada operacional séria para acesso, evidência e revisão.',
  securityText:
    'A RISCK COMPLY apoia operações profissionais de governança. Não substitui aconselhamento jurídico nem garante resultados regulatórios.',
  finalTitle: 'Construa uma operação de governança de IA que as equipas conseguem realmente executar.',
  finalText:
    'Crie o seu workspace e comece a organizar sistemas, responsáveis, riscos e evidências num único lugar.',
  features: [
    feature('Inventário de sistemas de IA', 'Registe sistemas, casos de uso, fornecedores, departamentos, países e contexto de dados.', Database),
    feature('Avaliações de risco', 'Registe sinais de risco, estado de revisão e contexto estruturado de avaliação.', Radar),
    feature('Packs de evidência', 'Organize documentos, decisões e registos de suporte para revisão.', ClipboardCheck),
    feature('Políticas e documentos', 'Prepare e mantenha documentação de governança num único workspace.', FileText),
    feature('Responsáveis e tarefas', 'Atribua responsabilidades e mantenha o acompanhamento visível entre equipas.', Users),
    feature('Histórico de atividade', 'Mantenha ações de governança e alterações de evidência rastreáveis ao longo do tempo.', ShieldCheck),
  ],
  workflowSteps: ['Descobrir', 'Registar', 'Avaliar', 'Atribuir', 'Documentar', 'Rever', 'Monitorizar'],
  controlViews: [
    {
      id: 'inventory',
      label: 'Inventário',
      eyebrow: 'Registo de sistemas',
      title: 'Saiba que IA existe em toda a organização.',
      description: 'Mapeie fornecedores, casos de uso, responsáveis, localizações, contexto de dados e estado de revisão num registo operacional vivo.',
      metrics: [
        { value: '24', label: 'Sistemas' },
        { value: '06', label: 'Departamentos' },
        { value: '04', label: 'Países' },
      ],
      rows: [
        { name: 'Assistente de suporte', meta: 'Operações · Portugal', status: 'Mapeado' },
        { name: 'Triagem de candidatos', meta: 'Pessoas · Alemanha', status: 'Revisão' },
        { name: 'Análise documental', meta: 'Jurídico · França', status: 'Ativo' },
      ],
    },
    {
      id: 'risk',
      label: 'Risco',
      eyebrow: 'Workspace de avaliação',
      title: 'Transforme sinais dispersos em contexto de risco revisável.',
      description: 'Mantenha classificação, fundamentação, estado de revisão e remediação juntos em vez de os dividir por vários ficheiros.',
      metrics: [
        { value: '08', label: 'Em revisão' },
        { value: '03', label: 'Atenção alta' },
        { value: '91%', label: 'Completo' },
      ],
      rows: [
        { name: 'Triagem de candidatos', meta: 'Revisão de direitos fundamentais', status: 'Prioridade' },
        { name: 'Deteção de fraude', meta: 'Verificação de supervisão humana', status: 'Aberto' },
        { name: 'Assistente de suporte', meta: 'Revisão de transparência', status: 'Pronto' },
      ],
    },
    {
      id: 'evidence',
      label: 'Evidências',
      eyebrow: 'Packs de revisão',
      title: 'Prepare evidências sem reconstruir toda a história a cada revisão.',
      description: 'Agrupe decisões, políticas, avaliações, responsáveis e ficheiros de suporte em packs mais fáceis de rever e entregar.',
      metrics: [
        { value: '17', label: 'Evidências' },
        { value: '05', label: 'Políticas' },
        { value: '12', label: 'Decisões' },
      ],
      rows: [
        { name: 'Pack do inventário de IA', meta: 'Atualizado hoje', status: 'Pronto' },
        { name: 'Política de governança de risco', meta: 'Responsável: Jurídico', status: 'Revisão' },
        { name: 'Due diligence de fornecedor', meta: '6 anexos', status: 'Rascunho' },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitorização',
      eyebrow: 'Operação contínua',
      title: 'Mantenha a governança viva depois da primeira avaliação.',
      description: 'Destaque alterações, revisões a expirar, ações por resolver e lacunas de responsabilidade antes que desapareçam em emails.',
      metrics: [
        { value: '07', label: 'Ações abertas' },
        { value: '02', label: 'A vencer' },
        { value: '00', label: 'Sem responsável' },
      ],
      rows: [
        { name: 'Rever triagem de candidatos', meta: 'Prazo em 4 dias', status: 'A vencer' },
        { name: 'Renovar evidências do fornecedor', meta: 'Responsável: Procurement', status: 'Aberto' },
        { name: 'Confirmar divulgações de suporte', meta: 'Responsável: Compliance', status: 'Monitorizado' },
      ],
    },
  ],
};

const copyByLocale: Record<Locale, LandingCopy> = {
  en,
  pt,
  es: en,
  fr: en,
  it: en,
  de: en,
};

function ProductPreview({ locale }: { locale: Locale }) {
  const isPt = locale === 'pt';

  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="pointer-events-none absolute -left-7 top-16 hidden w-44 rounded-2xl border border-cyan-100/15 bg-[#07131a]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl xl:block">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
          <Activity className="h-3.5 w-3.5" />
          {isPt ? 'Sinal ativo' : 'Live signal'}
        </div>
        <p className="mt-3 text-sm font-semibold text-white/88">{isPt ? 'Revisão atualizada' : 'Review updated'}</p>
        <p className="mt-1 text-xs leading-5 text-white/42">{isPt ? 'Histórico preservado' : 'History preserved'}</p>
      </div>

      <div className="pointer-events-none absolute -right-5 bottom-16 z-20 hidden w-48 rounded-2xl border border-emerald-100/15 bg-[#07130f]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl xl:block">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/55">
            {isPt ? 'Readiness' : 'Readiness'}
          </span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 motion-reduce:animate-none" />
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">82%</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,#67e8f9,#86efac)]" />
        </div>
      </div>

      <div className="relative rounded-[2rem] border border-white/15 bg-[#071017]/92 p-3 shadow-[0_45px_140px_rgba(0,0,0,.68)] backdrop-blur-2xl">
        <div className="absolute inset-x-20 -top-px h-px bg-[linear-gradient(90deg,transparent,rgba(165,243,252,.65),transparent)]" />
        <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#09131c]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.75)]" />
              <span className="text-xs font-semibold text-white/70">RISCK COMPLY</span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {isPt ? 'Workspace ativo' : 'Active workspace'}
            </span>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-[1.4fr_.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/55">
                    {isPt ? 'Governança de IA' : 'AI governance'}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {isPt ? 'Visão operacional' : 'Operational overview'}
                  </h3>
                </div>
                <BarChart3 className="h-5 w-5 text-cyan-100/70" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ['24', isPt ? 'Sistemas' : 'Systems'],
                  ['08', isPt ? 'Em revisão' : 'In review'],
                  ['17', isPt ? 'Evidências' : 'Evidence'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-2xl font-semibold text-white">{value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/38">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {[
                  [isPt ? 'Assistente de suporte' : 'Support assistant', isPt ? 'Risco limitado' : 'Limited risk', '82%'],
                  [isPt ? 'Triagem de candidatos' : 'Candidate screening', isPt ? 'Revisão necessária' : 'Review required', '64%'],
                  [isPt ? 'Análise documental' : 'Document analysis', isPt ? 'Em acompanhamento' : 'Monitoring', '91%'],
                ].map(([name, status, score]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white/85">{name}</p>
                      <p className="mt-1 text-xs text-white/38">{status}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-100">{score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.055] p-4">
                <FileCheck2 className="h-5 w-5 text-emerald-100" />
                <p className="mt-4 text-sm font-semibold text-white">
                  {isPt ? 'Pack de evidência' : 'Evidence pack'}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  {isPt
                    ? 'Decisões, responsáveis e documentos organizados para revisão.'
                    : 'Decisions, owners and documents organized for review.'}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.045] p-4">
                <Workflow className="h-5 w-5 text-cyan-100" />
                <p className="mt-4 text-sm font-semibold text-white">
                  {isPt ? 'Próximas ações' : 'Next actions'}
                </p>
                <div className="mt-3 space-y-2">
                  {[
                    isPt ? 'Validar responsável' : 'Validate owner',
                    isPt ? 'Rever risco' : 'Review risk',
                    isPt ? 'Anexar política' : 'Attach policy',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-white/48">
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-100/65" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalRail({ features }: { features: Feature[] }) {
  const items = [...features, ...features];

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.025] py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-[marquee_34s_linear_infinite] gap-3 motion-reduce:animate-none">
        {items.map(({ title, icon: Icon }, index) => (
          <div
            key={`${title}-${index}`}
            aria-hidden={index >= features.length}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0a141b]/90 px-4 py-2.5 text-sm text-white/68"
          >
            <Icon className="h-4 w-4 text-cyan-100/70" />
            <span>{title}</span>
            <span className="h-1 w-1 rounded-full bg-emerald-300/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AudienceRail({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-b border-white/10 bg-[#050909] px-4 py-9 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/32">
          {copy.audienceLabel}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {copy.audiences.map((audience, index) => (
            <div
              key={audience}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-4 text-center"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(165,243,252,.22),transparent)] opacity-0 transition group-hover:opacity-100" />
              <span className="text-sm font-semibold text-white/58 transition group-hover:text-white/88">{audience}</span>
              <span className="ml-2 text-[10px] text-white/20">0{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommandCentre({ copy }: { copy: LandingCopy }) {
  const [activeId, setActiveId] = useState<ControlView['id']>('inventory');
  const activeView = copy.controlViews.find((view) => view.id === activeId) ?? copy.controlViews[0]!;

  return (
    <section id="platform" className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
      <div className="absolute left-1/2 top-20 -z-10 h-[36rem] w-[72rem] -translate-x-1/2 rounded-full bg-cyan-300/[0.045] blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">{copy.commandEyebrow}</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.commandTitle}</h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-white/52 lg:justify-self-end">{copy.commandText}</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#071017]/86 shadow-[0_45px_130px_rgba(0,0,0,.45)]">
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-black/20 p-3">
            {copy.controlViews.map((view) => {
              const active = view.id === activeView.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveId(view.id)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'border border-cyan-100/20 bg-cyan-100/[0.09] text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,.08)]'
                      : 'border border-transparent text-white/40 hover:bg-white/[0.045] hover:text-white/75'
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[.82fr_1.18fr]">
            <div className="border-b border-white/10 p-7 sm:p-9 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/55">
                {activeView.eyebrow}
              </p>
              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                {activeView.title}
              </h3>
              <p className="mt-5 text-base leading-8 text-white/48">{activeView.description}</p>
              <div className="mt-9 grid grid-cols-3 gap-2">
                {activeView.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-2xl font-semibold tracking-[-0.05em] text-white">{metric.value}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/30">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative p-5 sm:p-7">
              <div className="absolute right-10 top-8 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl" />
              <div className="rounded-2xl border border-white/10 bg-black/25">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ScanSearch className="h-4 w-4 text-cyan-100/65" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      {activeView.label}
                    </span>
                  </div>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100/55">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 motion-reduce:animate-none" />
                    Live
                  </span>
                </div>

                <div className="space-y-2 p-3">
                  {activeView.rows.map((row, index) => (
                    <div
                      key={row.name}
                      className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-4 transition hover:border-cyan-100/16 hover:bg-white/[0.045]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xs font-semibold text-white/38">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/78">{row.name}</p>
                        <p className="mt-1 truncate text-xs text-white/34">{row.meta}</p>
                      </div>
                      <span className="rounded-full border border-emerald-100/12 bg-emerald-200/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100/65">
                        {row.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-white/18 transition group-hover:translate-x-0.5 group-hover:text-white/50" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,.38),rgba(8,15,20,.8))] p-5">
                  <div className="flex items-center justify-between">
                    <Gauge className="h-5 w-5 text-cyan-100/70" />
                    <ArrowUpRight className="h-4 w-4 text-white/28" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-white/78">
                    {copy === pt ? 'Visibilidade executiva' : 'Executive visibility'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/38">
                    {copy === pt
                      ? 'Estado, prioridades e lacunas num formato preparado para decisão.'
                      : 'Status, priorities and gaps in a decision-ready format.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,.30),rgba(8,15,20,.8))] p-5">
                  <div className="flex items-center justify-between">
                    <BellRing className="h-5 w-5 text-emerald-100/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-white/78">
                    {copy === pt ? 'Acompanhamento contínuo' : 'Continuous follow-up'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/38">
                    {copy === pt
                      ? 'Ações e revisões permanecem visíveis depois da avaliação.'
                      : 'Actions and reviews remain visible after assessment.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBento({ copy }: { copy: LandingCopy }) {
  return (
    <section className="px-4 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">{copy.sourceEyebrow}</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.sourceTitle}</h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/52">{copy.sourceText}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {copy.features.map(({ title, description, icon: Icon }, index) => {
            const layout =
              index === 0 || index === 3
                ? 'lg:col-span-7'
                : index === 1 || index === 4
                  ? 'lg:col-span-5'
                  : 'lg:col-span-6';

            return (
              <article
                key={title}
                className={`group relative min-h-[250px] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-7 transition duration-300 hover:-translate-y-1 hover:border-cyan-100/20 ${layout}`}
              >
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/[0.045] blur-3xl transition group-hover:bg-cyan-300/[0.075]" />
                <div className="flex items-start justify-between">
                  <div className="inline-flex rounded-2xl border border-white/10 bg-black/25 p-3 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-10 text-2xl font-semibold tracking-[-0.035em] text-white">{title}</h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/45">{description}</p>
                <div className="absolute inset-x-7 bottom-6 flex items-center gap-2 text-xs font-semibold text-white/28 transition group-hover:text-cyan-100/65">
                  <span>{copy === pt ? 'Explorar capacidade' : 'Explore capability'}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pathways({ copy }: { copy: LandingCopy }) {
  const pathways = [
    {
      icon: ShieldCheck,
      title: copy === pt ? 'Compliance e jurídico' : 'Compliance and legal',
      text:
        copy === pt
          ? 'Estruture avaliações, fundamentação, políticas e evidências para revisão.'
          : 'Structure assessments, rationale, policies and evidence for review.',
    },
    {
      icon: LockKeyhole,
      title: copy === pt ? 'Segurança e risco' : 'Security and risk',
      text:
        copy === pt
          ? 'Mantenha controlos, responsáveis, ações e histórico dentro do mesmo contexto.'
          : 'Keep controls, owners, actions and history inside the same context.',
    },
    {
      icon: Globe2,
      title: copy === pt ? 'Procurement e fornecedores' : 'Procurement and vendors',
      text:
        copy === pt
          ? 'Organize due diligence, documentação e acompanhamento de terceiros.'
          : 'Organize due diligence, documentation and third-party follow-up.',
    },
  ];

  return (
    <section className="border-y border-white/10 bg-white/[0.018] px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/55">
              {copy.pathwaysEyebrow}
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.pathwaysTitle}</h2>
          </div>
          <div className="grid gap-3">
            {pathways.map(({ icon: Icon, title, text }, index) => (
              <article
                key={title}
                className="group grid gap-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5 transition hover:border-emerald-100/18 hover:bg-white/[0.035] sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
                  <Icon className="h-5 w-5 text-emerald-100/72" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white/82">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/42">{text}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/22">
                  0{index + 1}
                  <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/55" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection({ copy }: { copy: LandingCopy }) {
  return (
    <section id="workflows" className="px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/55">
              {copy.workflowEyebrow}
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{copy.workflowTitle}</h2>
            <p className="mt-6 text-lg leading-8 text-white/52">{copy.workflowText}</p>
          </div>

          <div className="relative">
            <div className="absolute bottom-8 left-6 top-8 w-px bg-[linear-gradient(180deg,rgba(110,231,183,.55),rgba(255,255,255,.08))] sm:left-8" />
            <div className="space-y-3">
              {copy.workflowSteps.map((step, index) => (
                <div
                  key={step}
                  className="group relative flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 pl-16 transition hover:border-cyan-100/18 hover:bg-white/[0.04] sm:pl-20"
                >
                  <span className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/15 bg-[#07140f] text-sm font-semibold text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,.08)] sm:left-5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-white/78">{step}</p>
                    <p className="mt-1 text-xs text-white/32">
                      {copy === pt ? 'Contexto, responsável e histórico preservados' : 'Context, owner and history preserved'}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-100/32 transition group-hover:text-emerald-100/72" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const items: Array<[IconType, string]> = [
    [Fingerprint, locale === 'pt' ? 'Controlo de acesso por função' : 'Role-based access'],
    [Building2, locale === 'pt' ? 'Isolamento por organização' : 'Organization isolation'],
    [LockKeyhole, locale === 'pt' ? 'Rotas e sessões protegidas' : 'Protected routes and sessions'],
    [Layers3, locale === 'pt' ? 'Histórico e rastreabilidade' : 'History and traceability'],
  ];

  return (
    <section id="security" className="px-4 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_85%_5%,rgba(16,185,129,.16),transparent_30rem),radial-gradient(circle_at_15%_80%,rgba(14,165,233,.10),transparent_28rem),linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018))] p-7 shadow-[0_45px_130px_rgba(0,0,0,.38)] sm:p-10 lg:p-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
              <ShieldCheck className="h-4 w-4" />
              {copy.securityEyebrow}
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{copy.securityTitle}</h2>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/52">{copy.securityText}</p>

            <div className="mt-9 flex flex-wrap gap-3">
              {[
                locale === 'pt' ? 'Sem promessas jurídicas falsas' : 'No false legal promises',
                locale === 'pt' ? 'Evidência organizada' : 'Structured evidence',
                locale === 'pt' ? 'Responsabilidade visível' : 'Visible accountability',
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-white/48"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-100/65" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-12 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative grid gap-3 sm:grid-cols-2">
              {items.map(([Icon, label], index) => (
                <div
                  key={label}
                  className="min-h-40 rounded-[1.6rem] border border-white/10 bg-black/28 p-5 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-emerald-100/75" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/18">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-12 text-sm font-semibold text-white/72">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
          {[
            [Zap, locale === 'pt' ? 'Operação rápida' : 'Fast operation'],
            [Activity, locale === 'pt' ? 'Sinais visíveis' : 'Visible signals'],
            [FileCheck2, locale === 'pt' ? 'Revisões preparadas' : 'Review-ready packs'],
          ].map(([Icon, label]) => {
            const ItemIcon = Icon as IconType;
            return (
              <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.022] p-4">
                <ItemIcon className="h-4 w-4 text-cyan-100/60" />
                <span className="text-sm font-semibold text-white/55">{String(label)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WaitlistPage({ locale }: { locale: string }) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = copyByLocale[activeLocale] ?? en;
  const localeName = LOCALE_META[activeLocale].nativeName ?? LOCALE_META[activeLocale].name;
  const [menuOpen, setMenuOpen] = useState(false);
  const loginHref = `/${activeLocale}/login`;
  const signupHref = `/${activeLocale}/signup`;
  const pricingHref = `/${activeLocale}/pricing`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#040707] text-white">
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes hero-float { 0%, 100% { transform: translate3d(0,0,0) } 50% { transform: translate3d(0,-12px,0) } }
        @keyframes scan-line { 0% { transform: translateY(-20%) } 100% { transform: translateY(520%) } }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#040707]/78 backdrop-blur-2xl">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          aria-label="Primary navigation"
        >
          <Link href={`/${activeLocale}`} className="flex items-center gap-3" aria-label="RISCK COMPLY home">
            <Image
              src="/brand/risck-comply-wordmark.svg?v=20260801"
              alt="RISCK COMPLY"
              width={180}
              height={44}
              className="h-10 w-auto"
              priority
              unoptimized
            />
          </Link>

          <div className="hidden items-center gap-7 text-sm text-white/56 lg:flex">
            <a href="#platform" className="transition hover:text-white">{copy.nav.platform}</a>
            <a href="#workflows" className="transition hover:text-white">{copy.nav.workflows}</a>
            <a href="#security" className="transition hover:text-white">{copy.nav.security}</a>
            <Link href={pricingHref} className="transition hover:text-white">{copy.nav.pricing}</Link>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="sr-only">{localeName}</span>
            <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
            <Link
              href={loginHref}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/[0.06] hover:text-white"
            >
              {copy.nav.login}
            </Link>
            <Link
              href={signupHref}
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-100/30 bg-[linear-gradient(180deg,#eafff5,#b9f6d5)] px-5 py-2.5 text-sm font-bold text-[#07110c] shadow-[0_12px_40px_rgba(52,211,153,.18),inset_0_1px_0_rgba(255,255,255,.9)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(52,211,153,.25)]"
            >
              {copy.nav.signup}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/10 p-2 text-white lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen ? (
          <div id="mobile-nav" className="border-t border-white/10 bg-[#07100f] px-4 py-4 lg:hidden">
            <div className="grid gap-2">
              <a href="#platform" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">
                {copy.nav.platform}
              </a>
              <a href="#workflows" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">
                {copy.nav.workflows}
              </a>
              <a href="#security" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/72">
                {copy.nav.security}
              </a>
              <Link href={pricingHref} className="rounded-xl px-3 py-3 text-white/72">{copy.nav.pricing}</Link>
              <div className="mt-2 flex items-center gap-2">
                <LanguageSwitcher currentLocale={activeLocale} variant="dark" compact />
                <Link
                  href={loginHref}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold"
                >
                  {copy.nav.login}
                </Link>
                <Link
                  href={signupHref}
                  className="flex-1 rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-bold text-black"
                >
                  {copy.nav.signup}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section
        className="relative isolate min-h-[880px] overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-40"
        aria-labelledby="landing-title"
      >
        <video
          className="absolute inset-0 -z-40 h-full w-full object-cover opacity-[.32] motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/marketing/risck-comply-enterprise-hero.webm" type="video/webm" />
          <source src="/marketing/risck-comply-enterprise-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(90deg,rgba(4,7,7,.98)_0%,rgba(4,9,12,.90)_42%,rgba(4,7,7,.64)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_28%,rgba(16,185,129,.23),transparent_28rem),radial-gradient(circle_at_10%_15%,rgba(14,165,233,.23),transparent_34rem)]" />
        <div className="absolute inset-0 -z-10 tech-grid opacity-20" />
        <div className="absolute inset-x-0 bottom-0 h-52 -z-10 bg-[linear-gradient(180deg,transparent,#040707)]" />

        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/15 bg-cyan-100/[0.06] px-4 py-2 text-sm font-medium text-cyan-50/78 backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              {copy.eyebrow}
            </div>

            <h1
              id="landing-title"
              className="mt-7 text-5xl font-semibold leading-[1.01] tracking-[-0.066em] sm:text-6xl lg:text-[4.75rem]"
            >
              {copy.title}
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/62 sm:text-xl">{copy.subtitle}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={signupHref}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100/30 bg-[linear-gradient(180deg,#edfff7,#b8f7d6)] px-6 py-4 text-sm font-bold text-[#07110c] shadow-[0_16px_55px_rgba(52,211,153,.20),inset_0_1px_0_rgba(255,255,255,.95)] transition hover:-translate-y-0.5"
              >
                {copy.primaryCta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <a
                href="#platform"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/[0.09]"
              >
                {copy.secondaryCta}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/42">
              {copy.trust.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-100/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-[hero-float_8s_ease-in-out_infinite] motion-reduce:animate-none">
            <ProductPreview locale={activeLocale} />
          </div>
        </div>
      </section>

      <SignalRail features={copy.features} />
      <AudienceRail copy={copy} />
      <CommandCentre copy={copy} />
      <FeatureBento copy={copy} />
      <Pathways copy={copy} />
      <WorkflowSection copy={copy} />
      <SecuritySection copy={copy} locale={activeLocale} />

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-emerald-100/15 bg-[linear-gradient(135deg,rgba(10,48,40,.94),rgba(5,18,22,.98))] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,.42)] sm:p-14">
          <div className="absolute left-1/2 top-0 h-44 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/50">RISCK COMPLY</p>
            <h2 className="mx-auto mt-5 max-w-5xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
              {copy.finalTitle}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">{copy.finalText}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={signupHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                {copy.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={loginHref}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
              >
                {copy.nav.login}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter locale={activeLocale} />
    </main>
  );
}
