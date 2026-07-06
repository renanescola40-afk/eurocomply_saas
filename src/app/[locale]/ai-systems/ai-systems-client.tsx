'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, BrainCircuit, Database, FileText, Plus, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AiActRiskLevel } from '@/server/ai-governance/classifier';
import type { AiGovernanceReadiness } from '@/server/ai-governance/readiness';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import { ReadinessCard } from './readiness-card';
import { RoleWizardCard } from './role-wizard-card';

type AiSystemsClientProps = {
  locale: string;
  initialSystems: AiSystemRecord[];
  organizationName?: string | null;
  readiness: AiGovernanceReadiness;
};

type FormState = {
  name: string;
  ownerTeam: string;
  category: string;
  countryMarket: string;
  processedData: string;
  vendorName: string;
  modelName: string;
  useCase: string;
  role: string;
  lifecycleStatus: string;
  riskDomain: string;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
};

const defaultForm: FormState = {
  name: '',
  ownerTeam: '',
  category: '',
  countryMarket: '',
  processedData: '',
  vendorName: '',
  modelName: '',
  useCase: '',
  role: 'deployer',
  lifecycleStatus: 'planned',
  riskDomain: 'general_productivity',
  usesPersonalData: false,
  interactsWithPeople: false,
  generatesContent: false,
  biometricIdentification: false,
  manipulativeOrExploitative: false,
};

const baseInventoryCopy = {
  badge: 'AI Governance',
  title: 'AI systems inventory',
  subtitle: 'Register AI systems with owners, market, data, model facts, AI Act exposure, obligations and history-backed next actions.',
  org: 'Organization',
  total: 'AI systems',
  high: 'High-risk review',
  transparency: 'Transparency',
  addTitle: 'Register AI system',
  addSubtitle: 'Start with the facts a compliance team needs: owner, category, market, data, model, use case and risk signals.',
  name: 'System name',
  ownerTeam: 'Owner team',
  category: 'Category',
  countryMarket: 'Country or market',
  processedData: 'Data processed',
  vendorName: 'Vendor or model provider',
  modelName: 'Model name',
  useCasePlaceholder: 'Example: summarises customer support tickets and suggests replies to agents.',
  role: 'Organization role',
  status: 'Lifecycle status',
  domain: 'Risk domain',
  checks: 'Assessment flags',
  personalData: 'Processes personal data',
  people: 'Interacts directly with people',
  content: 'Generates content or decisions',
  biometric: 'Biometric identification or categorisation',
  prohibited: 'Could manipulate, exploit vulnerability or enable prohibited use',
  submit: 'Classify and save',
  saving: 'Classifying...',
  empty: 'No AI systems registered yet. Add the first one to build your AI Act inventory.',
  obligations: 'Initial obligations',
  nextActions: 'Next actions',
  error: 'Could not create AI system.',
  migration: 'The AI governance table is not available yet. Apply the Supabase migration before saving systems.',
  review: 'Open detail',
  model: 'Model',
  market: 'Market',
  data: 'Data',
  lastReassessed: 'Last reassessed',
};

const copy = {
  en: { ...baseInventoryCopy },
  pt: {
    ...baseInventoryCopy,
    badge: 'Governação de IA',
    title: 'Inventário de sistemas de IA',
    subtitle: 'Registe sistemas de IA com owner, mercado, dados, modelo, exposição ao AI Act, obrigações e próximas ações com histórico.',
    org: 'Organização',
    total: 'Sistemas de IA',
    high: 'Revisão alto risco',
    addTitle: 'Registar sistema de IA',
    addSubtitle: 'Comece pelos factos que uma equipa de compliance precisa: owner, categoria, mercado, dados, modelo, caso de uso e sinais de risco.',
    name: 'Nome do sistema',
    ownerTeam: 'Equipa responsável',
    category: 'Categoria',
    countryMarket: 'País ou mercado',
    processedData: 'Dados processados',
    vendorName: 'Fornecedor ou provedor do modelo',
    modelName: 'Nome do modelo',
    submit: 'Classificar e guardar',
    saving: 'A classificar...',
    review: 'Abrir detalhe',
    model: 'Modelo',
    market: 'Mercado',
    data: 'Dados',
    lastReassessed: 'Última reavaliação',
  },
  es: { ...baseInventoryCopy },
  fr: { ...baseInventoryCopy },
  it: { ...baseInventoryCopy },
  de: { ...baseInventoryCopy },
} as const;

const readinessCopy = {
  en: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
  pt: { score: 'Score de prontidão', notAssessed: 'Não avaliado', gaps: 'Análise de gaps', actions: 'Plano de ação por papel', country: 'Contexto compliance por país', productMap: 'Mapa do produto AI compliance', productSubtitle: 'Cada CTA aponta para uma rota funcional. Métricas só aparecem quando existem dados reais.', questionnaire: 'Executar questionário de uso', policy: 'Gerar policy pack', documents: 'Abrir gerador de documentos', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'Nenhum gap crítico detetado a partir dos dados atuais.', dataSource: 'Fonte de dados' },
  es: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
  fr: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
  it: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
  de: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
} as const;

const roleOptions = [['provider', 'Provider'], ['deployer', 'Deployer'], ['importer', 'Importer'], ['distributor', 'Distributor'], ['other', 'Other']] as const;
const statusOptions = [['planned', 'Planned'], ['pilot', 'Pilot'], ['production', 'Production'], ['retired', 'Retired']] as const;
const domainOptions = [
  ['general_productivity', 'General productivity'], ['customer_support', 'Customer support'], ['content_generation', 'Content generation'], ['biometrics', 'Biometrics'], ['employment', 'Employment / workers'], ['education', 'Education'], ['credit_finance', 'Credit / finance'], ['essential_services', 'Essential services'], ['law_enforcement', 'Law enforcement'], ['migration_border', 'Migration / border'], ['justice_democratic_processes', 'Justice / democratic processes'], ['safety_component', 'Safety component'], ['critical_infrastructure', 'Critical infrastructure'],
] as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function getReadinessCopy(locale: string) {
  return readinessCopy[locale as keyof typeof readinessCopy] ?? readinessCopy.en;
}

function localizedRoute(locale: string, route: string) {
  return `/${locale}${route.startsWith('/') ? route : `/${route}`}`;
}

function getRiskLabel(level: AiActRiskLevel) {
  if (level === 'prohibited_review') return 'Prohibited review';
  if (level === 'high_risk_review') return 'High-risk review';
  if (level === 'limited_transparency') return 'Limited transparency';
  return 'Minimal / low';
}

function getRiskTone(level: AiActRiskLevel) {
  if (level === 'prohibited_review') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (level === 'high_risk_review') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (level === 'limited_transparency') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

function severityTone(severity: string) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (severity === 'high') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (severity === 'medium') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

function roleLabel(locale: string, role: AiGovernanceReadiness['actionPlan'][number]['ownerRole']) {
  const t = getReadinessCopy(locale);
  return t[role];
}

export function AiSystemsClient({ locale, initialSystems, organizationName, readiness }: AiSystemsClientProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const rt = getReadinessCopy(locale);
  const [systems, setSystems] = useState(initialSystems);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const highRisk = systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length;
    const transparency = systems.filter((system) => system.risk_level === 'limited_transparency').length;
    return { highRisk, transparency };
  }, [systems]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice('');

    const response = await fetch('/api/ai-systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setNotice(payload?.error === 'ai_systems_table_missing' ? t.migration : payload?.message ?? t.error);
      setIsSubmitting(false);
      return;
    }

    setSystems((current) => [payload.system as AiSystemRecord, ...current]);
    setForm(defaultForm);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full"><BrainCircuit className="mr-1 h-3.5 w-3.5" />{t.badge}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            {organizationName ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">{t.org}: {organizationName}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border bg-muted/20 p-4"><Database className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{systems.length}</p><p className="text-xs text-muted-foreground">{t.total}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><ShieldAlert className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.highRisk}</p><p className="text-xs text-muted-foreground">{t.high}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{stats.transparency}</p><p className="text-xs text-muted-foreground">{t.transparency}</p></div>
          </div>
        </div>

        <ReadinessCard locale={locale} systems={systems} />

        <section id="readiness-score" className="mt-8 rounded-3xl border bg-background p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border bg-muted/20 p-5">
              <p className="text-sm font-medium text-muted-foreground">{rt.score}</p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-semibold tracking-tight">{readiness.score === null ? '—' : `${readiness.score}%`}</p>
                <Badge variant="outline" className="mb-1 rounded-full">{readiness.score === null ? rt.notAssessed : readiness.status}</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{readiness.boardSummary}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button asChild className="rounded-full"><Link href={localizedRoute(locale, '/ai-questionnaire')}>{rt.questionnaire}</Link></Button>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, '/policy-pack')}>{rt.policy}</Link></Button>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, '/document-generator')}>{rt.documents}</Link></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(readiness.coverage).map(([key, value]) => (
                <div key={key} className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border bg-background p-5">
            <h2 className="text-lg font-semibold">{rt.gaps}</h2>
            <div className="mt-4 grid gap-3">
              {readiness.gaps.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">{rt.noGaps}</div>
              ) : readiness.gaps.map((gap) => (
                <article key={gap.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{gap.title}</h3>
                    <Badge variant="outline" className={severityTone(gap.severity)}>{gap.severity}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.description}</p>
                  <Link href={localizedRoute(locale, gap.route)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    {gap.action} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-background p-5">
            <h2 className="text-lg font-semibold">{rt.actions}</h2>
            <div className="mt-4 space-y-3">
              {readiness.actionPlan.map((action) => (
                <Link key={action.id} href={localizedRoute(locale, action.route)} className="block rounded-2xl border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/30">
                  <Badge variant="outline" className="rounded-full">{roleLabel(locale, action.ownerRole)}</Badge>
                  <h3 className="mt-3 font-semibold">{action.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="mt-8 rounded-3xl border bg-muted/20 p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{t.addTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.addSubtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={t.name} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.ownerTeam} onChange={(event) => update('ownerTeam', event.target.value)} placeholder={t.ownerTeam} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder={t.category} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.countryMarket} onChange={(event) => update('countryMarket', event.target.value)} placeholder={t.countryMarket} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder={t.vendorName} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input value={form.modelName} onChange={(event) => update('modelName', event.target.value)} placeholder={t.modelName} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <select value={form.role} onChange={(event) => update('role', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.role}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={form.lifecycleStatus} onChange={(event) => update('lifecycleStatus', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" aria-label={t.status}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={form.riskDomain} onChange={(event) => update('riskDomain', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" aria-label={t.domain}>{domainOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <textarea value={form.processedData} onChange={(event) => update('processedData', event.target.value)} placeholder={t.processedData} className="min-h-24 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
            <textarea required minLength={8} value={form.useCase} onChange={(event) => update('useCase', event.target.value)} placeholder={t.useCasePlaceholder} className="min-h-28 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2" />
          </div>
          <fieldset className="mt-5 grid gap-3 rounded-2xl border bg-background p-4 md:grid-cols-2">
            <legend className="px-2 text-sm font-medium">{t.checks}</legend>
            {[
              ['usesPersonalData', t.personalData],
              ['interactsWithPeople', t.people],
              ['generatesContent', t.content],
              ['biometricIdentification', t.biometric],
              ['manipulativeOrExploitative', t.prohibited],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3 text-sm">
                <input type="checkbox" checked={Boolean(form[key as keyof FormState])} onChange={(event) => update(key as keyof FormState, event.target.checked as never)} className="mt-1" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <RoleWizardCard locale={locale} input={form} />
          {notice ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{notice}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="mt-5 rounded-full"><Plus className="h-4 w-4" />{isSubmitting ? t.saving : t.submit}</Button>
        </form>

        <div className="mt-8 grid gap-4">
          {systems.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground"><Bot className="mx-auto mb-3 h-8 w-8" />{t.empty}</div>
          ) : systems.map((system) => (
            <article key={system.id} className="rounded-3xl border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{system.name}</h3>
                    <Badge variant="outline" className={getRiskTone(system.risk_level)}>{getRiskLabel(system.risk_level)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{system.classification_summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{t.model}: {system.model_name ?? '—'}</span>
                    <span>{t.market}: {system.country_market ?? '—'}</span>
                    <span>{t.data}: {system.processed_data ?? '—'}</span>
                    <span>{t.lastReassessed}: {system.last_reassessed_at ?? '—'}</span>
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, `/ai-systems/${system.id}`)}>{t.review}</Link></Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{t.obligations}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{system.obligations.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{t.nextActions}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{system.next_actions.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
