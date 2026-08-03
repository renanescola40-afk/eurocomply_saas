'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  Globe2,
  Gauge,
  Layers3,
  ListChecks,
  Loader2,
  LockKeyhole,
  Radar,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AI_RISK_DOMAINS,
  AI_SYSTEM_ROLES,
  AI_SYSTEM_STATUSES,
  AI_USAGE_LEVELS,
  COMPANY_SECTORS,
  COMPANY_TYPES,
  COUNTRY_CODES,
  PLAN_INTENTS,
  calculateInitialReadinessScore,
  getRecommendedDocuments,
  getRiskLevelLabel,
  getSuggestedTasks,
  inferInitialRiskLevel,
  slugifyOrganization,
  type AiUsageLevel,
  type CompanySector,
  type CompanyType,
  type CountryCode,
  type OnboardingActivationInitialState,
  type OnboardingActivationInput,
  type OnboardingActionResult,
  type OnboardingDraftInput,
  type PlanIntent,
} from '@/lib/onboarding/activation';

type Props = {
  locale: string;
  requestedPlan?: string | null;
  initialState: OnboardingActivationInitialState;
  onSaveDraft: (input: OnboardingDraftInput) => Promise<OnboardingActionResult>;
  onComplete: (input: OnboardingActivationInput) => Promise<OnboardingActionResult>;
};

type FormState = {
  organizationId?: string;
  organizationName: string;
  slug: string;
  country: CountryCode;
  companyType: CompanyType;
  sector: CompanySector;
  aiUsage: AiUsageLevel;
  aiUsageSummary: string;
  aiSystemId?: string;
  aiSystemName: string;
  aiSystemUseCase: string;
  ownerTeam: string;
  vendorName: string;
  role: (typeof AI_SYSTEM_ROLES)[number];
  lifecycleStatus: (typeof AI_SYSTEM_STATUSES)[number];
  riskDomain: (typeof AI_RISK_DOMAINS)[number];
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
  inviteEmailText: string;
  selectedPlan: PlanIntent;
};

type LocaleCopy = {
  badge: string;
  title: string;
  subtitle: string;
  save: string;
  saving: string;
  saved: string;
  continue: string;
  back: string;
  finish: string;
  finishing: string;
  success: string;
  optional: string;
  requiredError: string;
  draftError: string;
};

const en: LocaleCopy = {
  badge: 'Activation workspace', title: 'Build the operating foundation for AI governance', subtitle: 'Configure the organization, first system, risk context and evidence queue in one controlled setup flow.',
  save: 'Save and continue later', saving: 'Saving...', saved: 'Progress saved. You can return to onboarding later.', continue: 'Continue', back: 'Back', finish: 'Generate readiness score', finishing: 'Generating...', success: 'Onboarding completed. Opening dashboard...', optional: 'Optional', requiredError: 'Complete the required fields before continuing.', draftError: 'Organization name and slug are required before saving.',
};
const pt: LocaleCopy = {
  badge: 'Configuração do workspace', title: 'Construa a base operacional da sua governança de IA', subtitle: 'Configure a organização, o primeiro sistema, o contexto de risco e a fila de evidências num fluxo controlado.',
  save: 'Guardar e continuar depois', saving: 'A guardar...', saved: 'Progresso guardado. Pode voltar ao onboarding depois.', continue: 'Continuar', back: 'Voltar', finish: 'Gerar score de prontidão', finishing: 'A gerar...', success: 'Onboarding concluído. A abrir o dashboard...', optional: 'Opcional', requiredError: 'Preencha os campos obrigatórios antes de continuar.', draftError: 'Nome da organização e slug são obrigatórios antes de guardar.',
};
const copyByLocale: Record<string, LocaleCopy> = {
  en, pt,
  es: { ...en, save: 'Guardar y continuar después', saving: 'Guardando...', continue: 'Continuar', back: 'Atrás', finish: 'Generar score de preparación' },
  fr: { ...en, save: 'Enregistrer et continuer plus tard', saving: 'Enregistrement...', continue: 'Continuer', back: 'Retour', finish: 'Générer le score' },
  it: { ...en, save: 'Salva e continua dopo', saving: 'Salvataggio...', continue: 'Continua', back: 'Indietro', finish: 'Genera readiness score' },
  de: { ...en, save: 'Speichern und später fortsetzen', saving: 'Speichern...', continue: 'Weiter', back: 'Zurück', finish: 'Readiness-Score erzeugen' },
};

const countryLabels: Record<CountryCode, string> = { pt: 'Portugal', es: 'Spain', fr: 'France', de: 'Germany', it: 'Italy', nl: 'Netherlands', be: 'Belgium', ie: 'Ireland', se: 'Sweden', dk: 'Denmark', no: 'Norway', fi: 'Finland', pl: 'Poland', other_eu: 'Other EU country', uk: 'United Kingdom', ch: 'Switzerland' };
const companyTypeLabels: Record<CompanyType, string> = { startup: 'Startup', sme: 'SME', scaleup: 'Scale-up', enterprise: 'Enterprise', agency: 'Agency', consultancy: 'Consultancy', public_sector: 'Public sector', non_profit: 'Non-profit' };
const sectorLabels: Record<CompanySector, string> = { saas: 'SaaS', fintech: 'Fintech', hr_recruiting: 'HR / recruiting', healthcare: 'Healthcare', education: 'Education', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Marketing agency', manufacturing: 'Manufacturing', financial_services: 'Financial services', public_services: 'Public services', other: 'Other' };
const aiUsageLabels: Record<AiUsageLevel, string> = { not_started: 'Not using AI yet', exploring: 'Exploring AI', internal_productivity: 'Internal productivity tools', customer_facing: 'Customer-facing AI', automated_decisions: 'Automated decisions', multiple_systems: 'Multiple AI systems' };
const planLabels: Record<PlanIntent, string> = { trial: 'Continue trial', essential: 'Essential', professional: 'Professional', business: 'Business', enterprise: 'Enterprise' };

const steps = [
  ['create-organization', Building2, 'Create organization', 'Criar organização'],
  ['country', Globe2, 'Choose country', 'Escolher país'],
  ['company-type', BriefcaseBusiness, 'Company type', 'Tipo de empresa'],
  ['sector', Layers3, 'Sector', 'Setor'],
  ['ai-usage', Activity, 'AI usage', 'Utilização de IA'],
  ['first-ai-system', Database, 'First AI system', 'Primeiro sistema de IA'],
  ['risk-classification', Radar, 'Initial risk', 'Risco inicial'],
  ['readiness-score', Gauge, 'Readiness score', 'Score de prontidão'],
  ['documents', FileText, 'Documents', 'Documentos'],
  ['tasks', ListChecks, 'Tasks', 'Tarefas'],
  ['team', Users, 'Invite team', 'Convidar equipa'],
  ['plan', CheckCircle2, 'Plan or trial', 'Plano ou trial'],
] as const;

type StepId = (typeof steps)[number][0];

const normalize = <T extends string>(values: readonly T[], value: string | null | undefined, fallback: T): T => values.includes(value as T) ? value as T : fallback;
const parseInviteEmails = (value: string) => Array.from(new Set(value.split(/[\n,;]/).map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')))).slice(0, 10);

function initialForm(state: OnboardingActivationInitialState, requestedPlan?: string | null): FormState {
  const org = state.organization;
  const ai = state.firstAiSystem;
  return {
    organizationId: org?.id,
    organizationName: org?.name ?? '',
    slug: org?.slug ?? '',
    country: normalize(COUNTRY_CODES, org?.country, 'pt'),
    companyType: normalize(COMPANY_TYPES, org?.companyType, 'startup'),
    sector: normalize(COMPANY_SECTORS, org?.sector, 'saas'),
    aiUsage: normalize(AI_USAGE_LEVELS, ai ? 'internal_productivity' : null, 'exploring'),
    aiUsageSummary: org?.aiUsageSummary ?? '',
    aiSystemId: ai?.id,
    aiSystemName: ai?.name ?? '',
    aiSystemUseCase: ai?.useCase ?? '',
    ownerTeam: ai?.ownerTeam ?? '',
    vendorName: ai?.vendorName ?? '',
    role: normalize(AI_SYSTEM_ROLES, ai?.role, 'deployer'),
    lifecycleStatus: normalize(AI_SYSTEM_STATUSES, ai?.lifecycleStatus, 'pilot'),
    riskDomain: normalize(AI_RISK_DOMAINS, ai?.riskDomain, 'general_productivity'),
    usesPersonalData: Boolean(ai?.usesPersonalData),
    interactsWithPeople: Boolean(ai?.interactsWithPeople),
    generatesContent: Boolean(ai?.generatesContent),
    biometricIdentification: Boolean(ai?.biometricIdentification),
    manipulativeOrExploitative: Boolean(ai?.manipulativeOrExploitative),
    inviteEmailText: state.latestRun?.invitedEmails.join('\n') ?? '',
    selectedPlan: normalize(PLAN_INTENTS, requestedPlan ?? state.latestRun?.selectedPlan ?? org?.selectedPlan, 'trial'),
  };
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/[0.08] bg-[#07101a]/90 shadow-[0_28px_90px_rgba(0,0,0,.22)] backdrop-blur-xl ${className}`}>{children}</div>;
}

export function B2BOnboardingFlow({ locale, requestedPlan, initialState, onSaveDraft, onComplete }: Props) {
  const router = useRouter();
  const copy = copyByLocale[locale] ?? en;
  const isPt = locale === 'pt';
  const t = (ptText: string, enText: string) => isPt ? ptText : enText;
  const [form, setForm] = useState<FormState>(() => initialForm(initialState, requestedPlan));
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, steps.findIndex(([id]) => id === initialState.organization?.onboardingStep)));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const inviteEmails = useMemo(() => parseInviteEmails(form.inviteEmailText), [form.inviteEmailText]);
  const riskLevel = useMemo(() => inferInitialRiskLevel(form), [form.riskDomain, form.usesPersonalData, form.interactsWithPeople, form.generatesContent, form.biometricIdentification, form.manipulativeOrExploitative]);
  const documents = useMemo(() => getRecommendedDocuments({ riskLevel, usesPersonalData: form.usesPersonalData, interactsWithPeople: form.interactsWithPeople, generatesContent: form.generatesContent, sector: form.sector }), [riskLevel, form.usesPersonalData, form.interactsWithPeople, form.generatesContent, form.sector]);
  const tasks = useMemo(() => getSuggestedTasks({ riskLevel, recommendedDocuments: documents, inviteEmails }), [riskLevel, documents, inviteEmails]);
  const score = useMemo(() => calculateInitialReadinessScore({
    hasOrganization: Boolean(form.organizationName && form.slug), hasCountry: Boolean(form.country), hasCompanyType: Boolean(form.companyType), hasSector: Boolean(form.sector), hasAiUsage: Boolean(form.aiUsage), hasFirstAiSystem: Boolean(form.aiSystemName && form.aiSystemUseCase && form.ownerTeam), hasRiskClassification: Boolean(riskLevel), recommendedDocuments: documents, suggestedTasks: tasks, invitedEmails: inviteEmails, selectedPlan: form.selectedPlan,
  }), [form.organizationName, form.slug, form.country, form.companyType, form.sector, form.aiUsage, form.aiSystemName, form.aiSystemUseCase, form.ownerTeam, form.selectedPlan, riskLevel, documents, tasks, inviteEmails]);

  const [stepId, StepIcon, stepEn, stepPt] = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const busy = status === 'saving' || status === 'submitting' || status === 'success';
  const slugValid = form.slug.trim().length >= 3;
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  function validate() {
    if (stepId === 'create-organization') return form.organizationName.trim().length >= 2 && slugValid;
    if (stepId === 'first-ai-system') return form.aiSystemName.trim().length >= 2 && form.aiSystemUseCase.trim().length >= 10 && form.ownerTeam.trim().length >= 2;
    return true;
  }

  function next() {
    if (!validate()) { setError(copy.requiredError); return; }
    setError(null);
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  async function saveDraft() {
    setError(null);
    if (!form.organizationName || !form.slug) { setError(copy.draftError); return; }
    setStatus('saving');
    try {
      const result = await onSaveDraft({ organizationId: form.organizationId, organizationName: form.organizationName, slug: form.slug, country: form.country, companyType: form.companyType, sector: form.sector, aiUsage: form.aiUsage, aiUsageSummary: form.aiUsageSummary, onboardingStep: stepId, selectedPlan: form.selectedPlan });
      setForm((current) => ({ ...current, organizationId: result.organizationId }));
      setStatus('saved');
    } catch (caught) { setStatus('idle'); setError(caught instanceof Error ? caught.message : 'Could not save onboarding progress.'); }
  }

  async function complete() {
    setError(null); setStatus('submitting');
    try {
      const result = await onComplete({ ...form, inviteEmails });
      setStatus('success');
      router.push(result.dashboardPath ?? `/${locale}/dashboard/organizations?onboarding=completed`);
    } catch (caught) { setStatus('idle'); setError(caught instanceof Error ? caught.message : 'Could not complete onboarding.'); }
  }

  function select<T extends string>(label: string, value: T, values: readonly T[], labels: Record<T, string>, onValue: (value: T) => void, hiddenEnglish?: string) {
    return <div className="space-y-3"><Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}{hiddenEnglish ? <span className="sr-only">{hiddenEnglish}</span> : null}</Label><Select value={value} onValueChange={(nextValue) => onValue(nextValue as T)}><SelectTrigger className="h-12 rounded-xl border-white/10 bg-[#050c14] px-4 text-white shadow-none focus:ring-emerald-300/30"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{labels[item]}</SelectItem>)}</SelectContent></Select></div>;
  }

  function content() {
    const inputClass = 'h-12 rounded-xl border-white/10 bg-[#050c14] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30';
    const fieldLabel = 'text-xs font-semibold uppercase tracking-[0.16em] text-slate-400';
    if (stepId === 'create-organization') return <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2"><div className="space-y-3"><Label htmlFor="organization-name" className={fieldLabel}>{t('Nome da organização', 'Organization name')}</Label><Input id="organization-name" value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value, slug: current.slug || slugifyOrganization(event.target.value) }))} placeholder="Acme Europe Ltd" className={inputClass} /></div><div className="space-y-3"><Label htmlFor="organization-slug" className={fieldLabel}>{t('Slug do workspace', 'Workspace slug')}</Label><Input id="organization-slug" value={form.slug} onChange={(event) => update('slug', slugifyOrganization(event.target.value))} placeholder="acme-europe" className={inputClass} /></div></div><div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">{t('Endereço do workspace', 'Workspace address')}</p><p className="mt-1 text-xs text-slate-500">risckcomply.com/ws/{form.slug || 'workspace'}</p></div><div className={`inline-flex items-center gap-2 text-xs font-medium ${slugValid ? 'text-emerald-200' : 'text-slate-500'}`}>{slugValid ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />}{slugValid ? t('Formato validado', 'Format validated') : t('Utilize pelo menos 3 caracteres', 'Use at least 3 characters')}</div></div></div>;
    if (stepId === 'country') return <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">{select(t('País principal de operação', 'Main operating country'), form.country, COUNTRY_CODES, countryLabels, (value) => update('country', value), 'Main operating country')}<ContextCard icon={Globe2} title={t('Contexto jurisdicional', 'Jurisdiction context')} text={t('O país orienta os primeiros controlos e referências regulatórias.', 'Country context informs the first controls and regulatory references.')} /></div>;
    if (stepId === 'company-type') return <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">{select(t('Tipo de empresa', 'Company type'), form.companyType, COMPANY_TYPES, companyTypeLabels, (value) => update('companyType', value))}<ContextCard icon={BriefcaseBusiness} title={t('Modelo operacional', 'Operating model')} text={t('A estrutura ajusta a profundidade das tarefas e responsabilidades.', 'Company structure adjusts task depth and ownership.')} /></div>;
    if (stepId === 'sector') return <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">{select(t('Setor principal', 'Sector'), form.sector, COMPANY_SECTORS, sectorLabels, (value) => update('sector', value))}<ContextCard icon={Layers3} title={t('Evidência contextual', 'Contextual evidence')} text={t('O setor ajuda a priorizar riscos, políticas e evidências.', 'Sector context helps prioritize risks, policies and evidence.')} /></div>;
    if (stepId === 'ai-usage') return <div className="space-y-5">{select(t('Utilização atual de IA', 'Current AI usage'), form.aiUsage, AI_USAGE_LEVELS, aiUsageLabels, (value) => update('aiUsage', value))}<div className="space-y-3"><Label htmlFor="ai-usage-summary" className={fieldLabel}>{t('Contexto operacional', 'Short context')}</Label><Input id="ai-usage-summary" value={form.aiUsageSummary} onChange={(event) => update('aiUsageSummary', event.target.value)} placeholder={t('Ex.: suporte utiliza IA para preparar respostas.', 'Example: support uses AI to draft replies.')} className={inputClass} /></div></div>;
    if (stepId === 'first-ai-system') return <div className="grid gap-5 md:grid-cols-2"><Field id="ai-system-name" label={t('Nome do sistema de IA', 'AI system name')} value={form.aiSystemName} onChange={(value) => update('aiSystemName', value)} placeholder="Customer Support Copilot" className={inputClass} /><Field id="owner-team" label={t('Equipa responsável', 'Owner team')} value={form.ownerTeam} onChange={(value) => update('ownerTeam', value)} placeholder="Operations / Support" className={inputClass} /><div className="md:col-span-2"><Field id="ai-system-use-case" label={t('Caso de utilização', 'Use case')} value={form.aiSystemUseCase} onChange={(value) => update('aiSystemUseCase', value)} placeholder={t('Resume pedidos e sugere respostas para revisão humana.', 'Summarises customer requests and proposes draft replies for human review.')} className={inputClass} /></div><Field id="vendor-name" label={`${t('Fornecedor ou modelo', 'Vendor or model provider')} (${copy.optional})`} value={form.vendorName} onChange={(value) => update('vendorName', value)} placeholder="OpenAI, Anthropic, internal model..." className={inputClass} />{select(t('Estado do ciclo de vida', 'Lifecycle status'), form.lifecycleStatus, AI_SYSTEM_STATUSES, { planned: 'Planned', pilot: 'Pilot', production: 'Production', retired: 'Retired' }, (value) => update('lifecycleStatus', value))}</div>;
    if (stepId === 'risk-classification') {
      const signals: Array<[keyof Pick<FormState, 'usesPersonalData' | 'interactsWithPeople' | 'generatesContent' | 'biometricIdentification' | 'manipulativeOrExploitative'>, string]> = [['usesPersonalData', t('Processa dados pessoais', 'Processes personal data')], ['interactsWithPeople', t('Interage diretamente com pessoas', 'Interacts directly with people')], ['generatesContent', t('Gera conteúdo ou recomendações', 'Generates content or recommendations')], ['biometricIdentification', t('Utiliza identificação biométrica', 'Uses biometric identification/categorisation')], ['manipulativeOrExploitative', t('Possível utilização proibida', 'Potential prohibited-use pattern')]];
      return <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2">{select(t('Papel da organização', 'Organization role'), form.role, AI_SYSTEM_ROLES, { provider: 'Provider', deployer: 'Deployer', importer: 'Importer', distributor: 'Distributor', other: 'Other' }, (value) => update('role', value))}{select(t('Domínio de risco', 'Risk domain'), form.riskDomain, AI_RISK_DOMAINS, Object.fromEntries(AI_RISK_DOMAINS.map((domain) => [domain, domain.replaceAll('_', ' ')])) as Record<FormState['riskDomain'], string>, (value) => update('riskDomain', value))}</div><div className="grid gap-3 md:grid-cols-2">{signals.map(([key, label]) => <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition focus-within:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-300/20 ${form[key] ? 'border-emerald-300/30 bg-emerald-300/[0.07]' : 'border-white/[0.08] bg-white/[0.02]'}`}><input type="checkbox" className="sr-only" checked={form[key]} onChange={(event) => update(key, event.target.checked)} /><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${form[key] ? 'border-emerald-300 bg-emerald-300 text-[#03110c]' : 'border-white/20 text-transparent'}`}><Check className="h-3.5 w-3.5" /></span><span className="text-sm leading-6 text-slate-300">{label}</span></label>)}</div><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">Initial classification: <strong>{getRiskLevelLabel(riskLevel)}</strong>. {t('Pode refinar esta classificação mais tarde.', 'You can refine this later in the AI systems inventory.')}</div></div>;
    }
    if (stepId === 'readiness-score') return <div className="grid gap-5 lg:grid-cols-[190px_1fr]"><ScoreRing score={score} /><div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">{t('Leitura inicial', 'Initial operating posture')}</p><h3 className="mt-3 text-2xl font-semibold text-white">{t('Score baseado em dados reais', 'Score generated from real setup data')}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{t('Combina perfil, sistema, risco, documentos, tarefas e equipa.', 'Combines profile, system, risk, documents, tasks and team signals.')}</p><div className="mt-5 grid grid-cols-3 gap-3"><SmallMetric value={documents.length} label={t('Documentos', 'Documents')} /><SmallMetric value={tasks.length} label={t('Tarefas', 'Tasks')} /><SmallMetric value={inviteEmails.length} label={t('Convites', 'Invites')} /></div></div></div>;
    if (stepId === 'documents') return <div className="grid gap-4 md:grid-cols-2">{documents.map((document) => <article key={document.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="flex items-center justify-between"><FileCheck2 className="h-5 w-5 text-cyan-200" /><Badge variant="outline" className="rounded-full border-white/10 text-slate-400">{document.priority}</Badge></div><h3 className="mt-5 font-medium text-white">{document.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{document.reason}</p></article>)}</div>;
    if (stepId === 'tasks') return <div className="space-y-3">{tasks.map((task, index) => <article key={task.id} className="grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:grid-cols-[40px_1fr]"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] text-sm text-emerald-200">{String(index + 1).padStart(2, '0')}</span><div><div className="flex items-center gap-2"><Badge variant="outline" className="rounded-full border-white/10 text-slate-400">{task.priority}</Badge><span className="text-xs text-slate-600">Due in {task.dueInDays} days</span></div><h3 className="mt-2 font-medium text-white">{task.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{task.description}</p></div></article>)}</div>;
    if (stepId === 'team') return <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]"><div className="space-y-3"><Label htmlFor="invite-emails" className={fieldLabel}>{t('Convidar colegas', 'Invite teammates')} ({copy.optional})</Label><Input id="invite-emails" value={form.inviteEmailText} onChange={(event) => update('inviteEmailText', event.target.value)} placeholder="legal@company.com, security@company.com" className={inputClass} /><p className="text-sm text-slate-500">{t('Separe vários emails por vírgulas ou novas linhas.', 'Separate multiple emails with commas, semicolons or new lines.')}</p>{inviteEmails.length > 0 ? <p className="text-sm text-emerald-200">{inviteEmails.length} invitation{inviteEmails.length === 1 ? '' : 's'} will be created.</p> : null}</div><ContextCard icon={Users} title={t('Responsabilidade partilhada', 'Shared accountability')} text={t('Adicione jurídico, segurança, produto ou operações quando estiver pronto.', 'Add legal, security, product or operations owners when ready.')} /></div>;
    return <div className="grid gap-4 md:grid-cols-2">{PLAN_INTENTS.map((plan) => <button key={plan} type="button" onClick={() => update('selectedPlan', plan)} className={`rounded-2xl border p-5 text-left transition ${form.selectedPlan === plan ? 'border-emerald-300/35 bg-emerald-300/[0.075]' : 'border-white/[0.08] bg-white/[0.025]'}`}><div className="flex items-center justify-between"><span className="font-medium text-white">{planLabels[plan]}</span>{form.selectedPlan === plan ? <CheckCircle2 className="h-5 w-5 text-emerald-200" /> : null}</div><p className="mt-3 text-sm leading-6 text-slate-500">{plan === 'trial' ? t('Continue a explorar e escolha a faturação mais tarde.', 'Keep exploring now and choose billing later.') : t('Continue com este plano selecionado para revisão.', 'Continue with this plan selected for billing review.')}</p></button>)}</div>;
  }

  return <div className="dark min-h-screen bg-[#03070b] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(14,165,233,.12),transparent_28rem),radial-gradient(circle_at_90%_7%,rgba(16,185,129,.12),transparent_30rem),linear-gradient(180deg,#03070b,#050a11_52%,#020508)]" />
    <div className="pointer-events-none fixed inset-0 tech-grid opacity-[0.12]" />
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#040910]/90 backdrop-blur-2xl"><div className="mx-auto flex max-w-[1680px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8"><div className="flex items-center gap-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"><Fingerprint className="h-5 w-5" /></span><div><p className="text-sm font-semibold tracking-[0.08em] text-white">RISCK COMPLY</p><p className="text-xs text-slate-600">Onboarding · {t('Configuração inicial', 'Initial configuration')}</p></div></div><div className="flex items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-300/[0.04] px-3 py-2 text-xs text-emerald-100/70"><LockKeyhole className="h-3.5 w-3.5" />{t('Sessão protegida', 'Protected session')}</div><div className="hidden rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-500 md:block">{t(`Etapa ${stepIndex + 1} de ${steps.length}`, `Stage ${stepIndex + 1} of ${steps.length}`)}</div></div></div></header>
    <div className="relative mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8"><div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)_310px]">
      <aside className="xl:sticky xl:top-[84px] xl:self-start"><Panel><div className="border-b border-white/[0.07] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('A sua jornada', 'Your setup journey')}</p><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-semibold">{stepIndex + 1}<span className="text-base text-slate-600">/{steps.length}</span></p><span className="text-sm font-semibold text-emerald-200">{progress}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#4ade80)]" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-slate-500">{t(`Etapa ${stepIndex + 1} de ${steps.length}`, `Step ${stepIndex + 1} of ${steps.length}`)}<span className="sr-only">Step {stepIndex + 1} of {steps.length}</span></p></div><nav aria-label="Onboarding steps" className="max-h-[calc(100vh-260px)] space-y-1.5 overflow-y-auto p-3">{steps.map(([id, Icon, titleEn, titlePt], index) => { const active = index === stepIndex; const completeStep = index < stepIndex; return <button key={id} type="button" onClick={() => { setError(null); setStepIndex(index); }} aria-current={active ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${active ? 'border-emerald-300/30 bg-emerald-300/[0.075] text-white' : 'border-transparent text-slate-500 hover:bg-white/[0.025]'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${active ? 'border-emerald-300/25 text-emerald-200' : 'border-white/[0.08] text-slate-600'}`}>{completeStep ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span>{isPt ? titlePt : titleEn}</span></button>; })}</nav></Panel></aside>
      <section className="min-w-0 space-y-5" aria-labelledby="onboarding-title"><Panel className="relative overflow-hidden p-6 sm:p-8"><div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,.14),transparent_18rem)]" /><div className="relative"><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80"><Sparkles className="h-3.5 w-3.5" />{copy.badge}</span><span className="rounded-full border border-white/[0.08] bg-black/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">{planLabels[form.selectedPlan]}</span></div><h1 id="onboarding-title" className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-4xl">{copy.title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{copy.subtitle}</p></div></Panel>
        <Panel><div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex items-start gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-200"><StepIcon className="h-5 w-5" /></span><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">{t(`Etapa ${stepIndex + 1}`, `Stage ${stepIndex + 1}`)}</p><h2 className="mt-1 text-xl font-semibold">{isPt ? stepPt : stepEn}</h2></div></div><div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2"><Gauge className="h-4 w-4 text-emerald-200" /><span className="text-sm font-semibold">{score}/100</span></div></div><div className="p-5 sm:p-7">{content()}{error ? <div role="alert" className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">{error}</div> : null}{status === 'saved' ? <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">{copy.saved}</div> : null}{status === 'success' ? <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">{copy.success}</div> : null}<div className="mt-7 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={saveDraft} disabled={busy} className="h-11 rounded-xl border-white/10 bg-white/[0.025] text-slate-200">{status === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{status === 'saving' ? copy.saving : copy.save}</Button><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => { setError(null); setStepIndex((current) => Math.max(0, current - 1)); }} disabled={busy || stepIndex === 0} className="h-11 rounded-xl border-white/10 bg-white/[0.025] text-slate-300"><ChevronLeft className="mr-1 h-4 w-4" />{copy.back}</Button>{stepIndex < steps.length - 1 ? <Button type="button" onClick={next} disabled={busy} className="h-11 rounded-xl bg-[linear-gradient(180deg,#b8f7db,#5ee7b7)] px-5 font-semibold text-[#04110c]">{copy.continue}<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={complete} disabled={busy} className="h-11 rounded-xl bg-[linear-gradient(180deg,#b8f7db,#5ee7b7)] px-5 font-semibold text-[#04110c]">{status === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{status === 'submitting' ? copy.finishing : copy.finish}</Button>}</div></div></div></Panel>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck, t('Controlo por função', 'Role-based control')], [Globe2, t('Contexto europeu', 'European context')], [Activity, t('Ativação progressiva', 'Progressive activation')], [BookOpenCheck, t('Evidência operacional', 'Operational evidence')]].map(([Icon, label]) => { const ItemIcon = Icon as LucideIcon; return <div key={String(label)} className="bg-[#07101a] p-5"><ItemIcon className="h-5 w-5 text-cyan-200/80" /><p className="mt-4 text-sm font-medium text-slate-200">{String(label)}</p></div>; })}</div>
      </section>
      <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start"><Panel className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Score de prontidão', 'Readiness score')}</p><div className="mt-5 flex items-center gap-4"><ScoreRing score={score} compact /><div><p className="text-sm font-medium">{score >= 70 ? t('Boa base operacional', 'Strong operating base') : t('Configuração em progresso', 'Setup in progress')}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t('O score evolui com dados reais.', 'The score evolves with real setup data.')}</p></div></div></Panel><Panel className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Sinais gerados', 'Generated signals')}</p><div className="mt-4 grid grid-cols-3 gap-2"><SmallMetric value={documents.length} label="Docs" /><SmallMetric value={tasks.length} label={t('Tarefas', 'Tasks')} /><SmallMetric value={inviteEmails.length} label={t('Convites', 'Invites')} /></div></Panel><Panel className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Estado operacional', 'Operating status')}</p><div className="mt-4 space-y-3"><Status icon={Radar} label={t('Classificação inicial', 'Initial classification')} value={getRiskLevelLabel(riskLevel)} /><Status icon={FileCheck2} label={t('Pacote documental', 'Document pack')} value={`${documents.length} ${t('sugeridos', 'suggested')}`} /><Status icon={ClipboardCheck} label={t('Fila de ações', 'Action queue')} value={`${tasks.length} ${t('tarefas', 'tasks')}`} /><Status icon={ShieldCheck} label={t('Plano selecionado', 'Selected plan')} value={planLabels[form.selectedPlan]} /></div></Panel></aside>
    </div></div>
  </div>;
}

function Field({ id, label, value, onChange, placeholder, className }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; className: string }) {
  return <div className="space-y-3"><Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} /></div>;
}
function ContextCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><Icon className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm font-medium text-white">{title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>; }
function ScoreRing({ score, compact = false }: { score: number; compact?: boolean }) { const size = compact ? 'h-24 w-24 p-[7px]' : 'h-36 w-36 p-[10px]'; return <div className={`relative flex shrink-0 items-center justify-center rounded-full ${size}`} style={{ background: `conic-gradient(#58f0bd ${score * 3.6}deg, rgba(148,163,184,.12) 0deg)` }}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07101a]"><span className={`${compact ? 'text-2xl' : 'text-4xl'} font-semibold tracking-[-0.05em]`}>{score}</span><span className="text-[10px] text-slate-600">/100</span></div></div>; }
function SmallMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">{label}</p></div>; }
function Status({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3"><Icon className="h-4 w-4 text-cyan-200/65" /><div className="min-w-0"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 truncate text-sm font-medium text-slate-300">{value}</p></div></div>; }
