'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
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
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
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

type B2BOnboardingFlowProps = {
  locale: string;
  requestedPlan?: string | null;
  initialState: OnboardingActivationInitialState;
  onSaveDraft: (input: OnboardingDraftInput) => Promise<OnboardingActionResult>;
  onComplete: (input: OnboardingActivationInput) => Promise<OnboardingActionResult>;
};

type WizardFormState = {
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

const copyByLocale = {
  en: {
    badge: 'Activation workspace',
    title: 'Build the operating foundation for AI governance',
    subtitle: 'Configure the organization, first system, risk context and evidence queue in one controlled setup flow.',
    save: 'Save and continue later',
    saving: 'Saving...',
    saved: 'Progress saved. You can return to onboarding later.',
    continue: 'Continue',
    back: 'Back',
    finish: 'Generate readiness score',
    finishing: 'Generating...',
    success: 'Onboarding completed. Opening dashboard...',
    optional: 'Optional',
    requiredError: 'Complete the required fields before continuing.',
    draftError: 'Organization name and slug are required before saving.',
  },
  pt: {
    badge: 'Configuração do workspace',
    title: 'Construa a base operacional da sua governança de IA',
    subtitle: 'Configure a organização, o primeiro sistema, o contexto de risco e a fila de evidências num fluxo controlado.',
    save: 'Guardar e continuar depois',
    saving: 'A guardar...',
    saved: 'Progresso guardado. Pode voltar ao onboarding depois.',
    continue: 'Continuar',
    back: 'Voltar',
    finish: 'Gerar score de prontidão',
    finishing: 'A gerar...',
    success: 'Onboarding concluído. A abrir o dashboard...',
    optional: 'Opcional',
    requiredError: 'Preencha os campos obrigatórios antes de continuar.',
    draftError: 'Nome da organização e slug são obrigatórios antes de guardar.',
  },
  es: {
    badge: 'Configuración del workspace',
    title: 'Construye la base operativa de tu gobernanza de IA',
    subtitle: 'Configura la organización, el primer sistema, el contexto de riesgo y la cola de evidencias.',
    save: 'Guardar y continuar después',
    saving: 'Guardando...',
    saved: 'Progreso guardado. Puedes volver después.',
    continue: 'Continuar',
    back: 'Atrás',
    finish: 'Generar score de preparación',
    finishing: 'Generando...',
    success: 'Onboarding completado. Abriendo dashboard...',
    optional: 'Opcional',
    requiredError: 'Completa los campos requeridos antes de continuar.',
    draftError: 'Nombre de organización y slug son obligatorios antes de guardar.',
  },
  fr: {
    badge: 'Configuration du workspace',
    title: 'Construisez la base opérationnelle de votre gouvernance IA',
    subtitle: 'Configurez l’organisation, le premier système, le contexte de risque et la file de preuves.',
    save: 'Enregistrer et continuer plus tard',
    saving: 'Enregistrement...',
    saved: 'Progression enregistrée. Vous pourrez reprendre plus tard.',
    continue: 'Continuer',
    back: 'Retour',
    finish: 'Générer le score',
    finishing: 'Génération...',
    success: 'Onboarding terminé. Ouverture du dashboard...',
    optional: 'Optionnel',
    requiredError: 'Complétez les champs requis avant de continuer.',
    draftError: 'Le nom de l’organisation et le slug sont requis avant enregistrement.',
  },
  it: {
    badge: 'Configurazione workspace',
    title: 'Costruisci la base operativa della governance IA',
    subtitle: 'Configura organizzazione, primo sistema, contesto di rischio e coda delle evidenze.',
    save: 'Salva e continua dopo',
    saving: 'Salvataggio...',
    saved: 'Progressi salvati. Puoi tornare più tardi.',
    continue: 'Continua',
    back: 'Indietro',
    finish: 'Genera readiness score',
    finishing: 'Generazione...',
    success: 'Onboarding completato. Apertura dashboard...',
    optional: 'Opzionale',
    requiredError: 'Completa i campi richiesti prima di continuare.',
    draftError: 'Nome organizzazione e slug sono obbligatori prima del salvataggio.',
  },
  de: {
    badge: 'Workspace-Einrichtung',
    title: 'Schaffen Sie die operative Grundlage Ihrer KI-Governance',
    subtitle: 'Organisation, erstes System, Risikokontext und Evidenz-Queue in einem kontrollierten Ablauf einrichten.',
    save: 'Speichern und später fortsetzen',
    saving: 'Speichern...',
    saved: 'Fortschritt gespeichert. Sie können später fortfahren.',
    continue: 'Weiter',
    back: 'Zurück',
    finish: 'Readiness-Score erzeugen',
    finishing: 'Erzeugen...',
    success: 'Onboarding abgeschlossen. Dashboard wird geöffnet...',
    optional: 'Optional',
    requiredError: 'Füllen Sie die Pflichtfelder aus, bevor Sie fortfahren.',
    draftError: 'Organisationsname und Slug sind vor dem Speichern erforderlich.',
  },
} as const;

const countryLabels: Record<CountryCode, string> = {
  pt: 'Portugal', es: 'Spain', fr: 'France', de: 'Germany', it: 'Italy', nl: 'Netherlands', be: 'Belgium', ie: 'Ireland', se: 'Sweden', dk: 'Denmark', no: 'Norway', fi: 'Finland', pl: 'Poland', other_eu: 'Other EU country', uk: 'United Kingdom', ch: 'Switzerland',
};
const companyTypeLabels: Record<CompanyType, string> = { startup: 'Startup', sme: 'SME', scaleup: 'Scale-up', enterprise: 'Enterprise', agency: 'Agency', consultancy: 'Consultancy', public_sector: 'Public sector', non_profit: 'Non-profit' };
const sectorLabels: Record<CompanySector, string> = { saas: 'SaaS', fintech: 'Fintech', hr_recruiting: 'HR / recruiting', healthcare: 'Healthcare', education: 'Education', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Marketing agency', manufacturing: 'Manufacturing', financial_services: 'Financial services', public_services: 'Public services', other: 'Other' };
const aiUsageLabels: Record<AiUsageLevel, string> = { not_started: 'Not using AI yet', exploring: 'Exploring AI', internal_productivity: 'Internal productivity tools', customer_facing: 'Customer-facing AI', automated_decisions: 'Automated decisions', multiple_systems: 'Multiple AI systems' };
const planLabels: Record<PlanIntent, string> = { trial: 'Continue trial', essential: 'Essential', professional: 'Professional', business: 'Business', enterprise: 'Enterprise' };

const stepDefinitions = [
  { id: 'create-organization', icon: Building2 },
  { id: 'country', icon: Globe2 },
  { id: 'company-type', icon: BriefcaseBusiness },
  { id: 'sector', icon: Layers3 },
  { id: 'ai-usage', icon: Activity },
  { id: 'first-ai-system', icon: Database },
  { id: 'risk-classification', icon: Radar },
  { id: 'readiness-score', icon: Gauge },
  { id: 'documents', icon: FileText },
  { id: 'tasks', icon: ListChecks },
  { id: 'team', icon: Users },
  { id: 'plan', icon: CheckCircle2 },
] as const;

type StepId = (typeof stepDefinitions)[number]['id'];
const stepCopy: Record<StepId, { en: string; pt: string; descriptionEn: string; descriptionPt: string }> = {
  'create-organization': { en: 'Create organization', pt: 'Criar organização', descriptionEn: 'Define the legal entity and its workspace identifier.', descriptionPt: 'Defina a entidade legal e o identificador do workspace.' },
  country: { en: 'Choose country', pt: 'Escolher país', descriptionEn: 'Set the primary operating jurisdiction.', descriptionPt: 'Defina a jurisdição principal da operação.' },
  'company-type': { en: 'Company type', pt: 'Tipo de empresa', descriptionEn: 'Adapt the operating model to the organization profile.', descriptionPt: 'Adapte o modelo operacional ao perfil da organização.' },
  sector: { en: 'Sector', pt: 'Setor', descriptionEn: 'Contextualize sector-specific risks and evidence.', descriptionPt: 'Contextualize riscos e evidências específicos do setor.' },
  'ai-usage': { en: 'AI usage', pt: 'Utilização de IA', descriptionEn: 'Map the current scope and maturity of AI adoption.', descriptionPt: 'Mapeie o âmbito e a maturidade atual da adoção de IA.' },
  'first-ai-system': { en: 'First AI system', pt: 'Primeiro sistema de IA', descriptionEn: 'Register a real system, owner and operational purpose.', descriptionPt: 'Registe um sistema real, responsável e finalidade operacional.' },
  'risk-classification': { en: 'Initial risk', pt: 'Risco inicial', descriptionEn: 'Capture the signals that drive the first classification.', descriptionPt: 'Registe os sinais que orientam a primeira classificação.' },
  'readiness-score': { en: 'Readiness score', pt: 'Score de prontidão', descriptionEn: 'Review the initial operating posture generated from setup data.', descriptionPt: 'Reveja a postura operacional inicial gerada pelos dados configurados.' },
  documents: { en: 'Documents', pt: 'Documentos', descriptionEn: 'Prepare the first evidence and policy workstream.', descriptionPt: 'Prepare o primeiro fluxo de evidências e políticas.' },
  tasks: { en: 'Tasks', pt: 'Tarefas', descriptionEn: 'Turn identified gaps into an accountable action queue.', descriptionPt: 'Transforme lacunas identificadas numa fila de ações responsáveis.' },
  team: { en: 'Invite team', pt: 'Convidar equipa', descriptionEn: 'Bring the right owners into the governance workspace.', descriptionPt: 'Adicione os responsáveis certos ao workspace de governança.' },
  plan: { en: 'Plan or trial', pt: 'Plano ou trial', descriptionEn: 'Confirm the commercial path without blocking activation.', descriptionPt: 'Confirme o caminho comercial sem bloquear a ativação.' },
};

function normalizePlan(value?: string | null): PlanIntent { return PLAN_INTENTS.includes(value as PlanIntent) ? (value as PlanIntent) : 'trial'; }
function normalizeCountry(value?: string | null): CountryCode { return COUNTRY_CODES.includes(value as CountryCode) ? (value as CountryCode) : 'pt'; }
function normalizeCompanyType(value?: string | null): CompanyType { return COMPANY_TYPES.includes(value as CompanyType) ? (value as CompanyType) : 'startup'; }
function normalizeSector(value?: string | null): CompanySector { return COMPANY_SECTORS.includes(value as CompanySector) ? (value as CompanySector) : 'saas'; }
function normalizeAiUsage(value?: string | null): AiUsageLevel { return AI_USAGE_LEVELS.includes(value as AiUsageLevel) ? (value as AiUsageLevel) : 'exploring'; }
function parseInviteEmails(value: string) { return Array.from(new Set(value.split(/[\n,;]/).map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')))).slice(0, 10); }

function buildInitialForm(initialState: OnboardingActivationInitialState, requestedPlan?: string | null): WizardFormState {
  const organization = initialState.organization;
  const firstAiSystem = initialState.firstAiSystem;
  const selectedPlan = normalizePlan(requestedPlan ?? initialState.latestRun?.selectedPlan ?? organization?.selectedPlan ?? 'trial');
  return {
    organizationId: organization?.id,
    organizationName: organization?.name ?? '',
    slug: organization?.slug ?? '',
    country: normalizeCountry(organization?.country),
    companyType: normalizeCompanyType(organization?.companyType),
    sector: normalizeSector(organization?.sector),
    aiUsage: normalizeAiUsage(firstAiSystem ? 'internal_productivity' : null),
    aiUsageSummary: organization?.aiUsageSummary ?? '',
    aiSystemId: firstAiSystem?.id,
    aiSystemName: firstAiSystem?.name ?? '',
    aiSystemUseCase: firstAiSystem?.useCase ?? '',
    ownerTeam: firstAiSystem?.ownerTeam ?? '',
    vendorName: firstAiSystem?.vendorName ?? '',
    role: AI_SYSTEM_ROLES.includes(firstAiSystem?.role as WizardFormState['role']) ? firstAiSystem?.role as WizardFormState['role'] : 'deployer',
    lifecycleStatus: AI_SYSTEM_STATUSES.includes(firstAiSystem?.lifecycleStatus as WizardFormState['lifecycleStatus']) ? firstAiSystem?.lifecycleStatus as WizardFormState['lifecycleStatus'] : 'pilot',
    riskDomain: AI_RISK_DOMAINS.includes(firstAiSystem?.riskDomain as WizardFormState['riskDomain']) ? firstAiSystem?.riskDomain as WizardFormState['riskDomain'] : 'general_productivity',
    usesPersonalData: Boolean(firstAiSystem?.usesPersonalData),
    interactsWithPeople: Boolean(firstAiSystem?.interactsWithPeople),
    generatesContent: Boolean(firstAiSystem?.generatesContent),
    biometricIdentification: Boolean(firstAiSystem?.biometricIdentification),
    manipulativeOrExploitative: Boolean(firstAiSystem?.manipulativeOrExploitative),
    inviteEmailText: initialState.latestRun?.invitedEmails.join('\n') ?? '',
    selectedPlan,
  };
}

export function B2BOnboardingFlow({ locale, requestedPlan, initialState, onSaveDraft, onComplete }: B2BOnboardingFlowProps) {
  const router = useRouter();
  const copy = copyByLocale[locale as keyof typeof copyByLocale] ?? copyByLocale.en;
  const isPt = locale === 'pt';
  const [form, setForm] = useState<WizardFormState>(() => buildInitialForm(initialState, requestedPlan));
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, stepDefinitions.findIndex((step) => step.id === initialState.organization?.onboardingStep)));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const inviteEmails = useMemo(() => parseInviteEmails(form.inviteEmailText), [form.inviteEmailText]);
  const riskLevel = useMemo(() => inferInitialRiskLevel(form), [form.riskDomain, form.usesPersonalData, form.interactsWithPeople, form.generatesContent, form.biometricIdentification, form.manipulativeOrExploitative]);
  const recommendedDocuments = useMemo(() => getRecommendedDocuments({ riskLevel, usesPersonalData: form.usesPersonalData, interactsWithPeople: form.interactsWithPeople, generatesContent: form.generatesContent, sector: form.sector }), [form.generatesContent, form.interactsWithPeople, form.sector, form.usesPersonalData, riskLevel]);
  const suggestedTasks = useMemo(() => getSuggestedTasks({ riskLevel, recommendedDocuments, inviteEmails }), [inviteEmails, recommendedDocuments, riskLevel]);
  const readinessScore = useMemo(() => calculateInitialReadinessScore({
    hasOrganization: Boolean(form.organizationName && form.slug),
    hasCountry: Boolean(form.country),
    hasCompanyType: Boolean(form.companyType),
    hasSector: Boolean(form.sector),
    hasAiUsage: Boolean(form.aiUsage),
    hasFirstAiSystem: Boolean(form.aiSystemName && form.aiSystemUseCase && form.ownerTeam),
    hasRiskClassification: Boolean(riskLevel),
    recommendedDocuments,
    suggestedTasks,
    invitedEmails: inviteEmails,
    selectedPlan: form.selectedPlan,
  }), [form.organizationName, form.slug, form.country, form.companyType, form.sector, form.aiUsage, form.aiSystemName, form.aiSystemUseCase, form.ownerTeam, form.selectedPlan, inviteEmails, recommendedDocuments, riskLevel, suggestedTasks]);

  const activeStep = stepDefinitions[stepIndex];
  const activeStepCopy = stepCopy[activeStep.id];
  const progress = Math.round(((stepIndex + 1) / stepDefinitions.length) * 100);
  const isBusy = status === 'saving' || status === 'submitting' || status === 'success';
  const displayStepTitle = isPt ? activeStepCopy.pt : activeStepCopy.en;
  const displayStepDescription = isPt ? activeStepCopy.descriptionPt : activeStepCopy.descriptionEn;
  const t = (pt: string, en: string) => isPt ? pt : en;

  function updateForm<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function validateStep() {
    if (activeStep.id === 'create-organization') return Boolean(form.organizationName.trim().length >= 2 && form.slug.trim().length >= 3);
    if (activeStep.id === 'first-ai-system') return Boolean(form.aiSystemName.trim().length >= 2 && form.aiSystemUseCase.trim().length >= 10 && form.ownerTeam.trim().length >= 2);
    return true;
  }
  function goNext() { if (!validateStep()) { setError(copy.requiredError); return; } setError(null); setStepIndex((current) => Math.min(stepDefinitions.length - 1, current + 1)); }

  async function handleSaveDraft() {
    setError(null);
    if (!form.organizationName || !form.slug) { setError(copy.draftError); return; }
    setStatus('saving');
    try {
      const result = await onSaveDraft({ organizationId: form.organizationId, organizationName: form.organizationName, slug: form.slug, country: form.country, companyType: form.companyType, sector: form.sector, aiUsage: form.aiUsage, aiUsageSummary: form.aiUsageSummary, onboardingStep: activeStep.id, selectedPlan: form.selectedPlan });
      setForm((current) => ({ ...current, organizationId: result.organizationId }));
      setStatus('saved');
    } catch (caughtError) { setStatus('idle'); setError(caughtError instanceof Error ? caughtError.message : 'Could not save onboarding progress.'); }
  }

  async function handleComplete() {
    setError(null); setStatus('submitting');
    try {
      const result = await onComplete({ organizationId: form.organizationId, organizationName: form.organizationName, slug: form.slug, country: form.country, companyType: form.companyType, sector: form.sector, aiUsage: form.aiUsage, aiUsageSummary: form.aiUsageSummary, aiSystemId: form.aiSystemId, aiSystemName: form.aiSystemName, aiSystemUseCase: form.aiSystemUseCase, ownerTeam: form.ownerTeam, vendorName: form.vendorName, role: form.role, lifecycleStatus: form.lifecycleStatus, riskDomain: form.riskDomain, usesPersonalData: form.usesPersonalData, interactsWithPeople: form.interactsWithPeople, generatesContent: form.generatesContent, biometricIdentification: form.biometricIdentification, manipulativeOrExploitative: form.manipulativeOrExploitative, inviteEmails, selectedPlan: form.selectedPlan });
      setStatus('success'); router.push(result.dashboardPath ?? `/${locale}/dashboard/organizations?onboarding=completed`);
    } catch (caughtError) { setStatus('idle'); setError(caughtError instanceof Error ? caughtError.message : 'Could not complete onboarding.'); }
  }

  function renderSelect<T extends string>(label: string, value: T, options: readonly T[], labels: Record<T, string>, onChange: (value: T) => void, hiddenEnglishLabel?: string) {
    return <div className="space-y-3"><Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}{hiddenEnglishLabel ? <span className="sr-only">{hiddenEnglishLabel}</span> : null}</Label><Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}><SelectTrigger className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-sm text-white shadow-none focus:ring-emerald-300/30"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{labels[option]}</SelectItem>)}</SelectContent></Select></div>;
  }

  function renderStepContent() {
    if (activeStep.id === 'create-organization') return <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2"><div className="space-y-3"><Label htmlFor="organization-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Nome da organização', 'Organization name')}</Label><Input id="organization-name" value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value, slug: current.slug || slugifyOrganization(event.target.value) }))} placeholder="Acme Europe Ltd" className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /><p className="text-xs leading-5 text-slate-500">{t('Nome legal ou comercial apresentado no workspace.', 'Legal or trading name shown across the workspace.')}</p></div><div className="space-y-3"><Label htmlFor="organization-slug" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Slug do workspace', 'Workspace slug')}</Label><Input id="organization-slug" value={form.slug} onChange={(event) => updateForm('slug', slugifyOrganization(event.target.value))} placeholder="acme-europe" className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /><p className="text-xs leading-5 text-slate-500">{t('Identificador técnico único para a organização.', 'Unique technical identifier for the organization.')}</p></div></div><div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-2 text-cyan-200"><Globe2 className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">{t('Endereço do workspace', 'Workspace address')}</p><p className="mt-1 text-xs text-slate-500">risckcomply.com/ws/{form.slug || 'workspace'}</p></div></div><div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-200"><CheckCircle2 className="h-4 w-4" />{t('Formato validado', 'Format validated')}</div></div></div>;
    if (activeStep.id === 'country') return <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">{renderSelect(t('País principal de operação', 'Main operating country'), form.country, COUNTRY_CODES, countryLabels, (value) => updateForm('country', value), 'Main operating country')}<div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><Globe2 className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm font-medium text-white">{t('Contexto jurisdicional', 'Jurisdiction context')}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t('Este país orienta os primeiros controlos, documentos e referências regulatórias.', 'This country informs the first controls, documents and regulatory references.')}</p></div></div>;
    if (activeStep.id === 'company-type') return <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">{renderSelect(t('Tipo de empresa', 'Company type'), form.companyType, COMPANY_TYPES, companyTypeLabels, (value) => updateForm('companyType', value))}<div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><BriefcaseBusiness className="h-5 w-5 text-emerald-200" /><p className="mt-4 text-sm font-medium text-white">{t('Modelo operacional', 'Operating model')}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t('A estrutura da empresa ajusta a profundidade das tarefas e responsabilidades.', 'Company structure adjusts the depth of tasks and ownership.')}</p></div></div>;
    if (activeStep.id === 'sector') return <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">{renderSelect(t('Setor principal', 'Sector'), form.sector, COMPANY_SECTORS, sectorLabels, (value) => updateForm('sector', value))}<div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><Layers3 className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm font-medium text-white">{t('Evidência contextual', 'Contextual evidence')}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t('O setor ajuda a priorizar riscos, políticas e evidências relevantes.', 'Sector context helps prioritize relevant risks, policies and evidence.')}</p></div></div>;
    if (activeStep.id === 'ai-usage') return <div className="space-y-6">{renderSelect(t('Utilização atual de IA', 'Current AI usage'), form.aiUsage, AI_USAGE_LEVELS, aiUsageLabels, (value) => updateForm('aiUsage', value))}<div className="space-y-3"><Label htmlFor="ai-usage-summary" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Contexto operacional', 'Short context')}</Label><Input id="ai-usage-summary" value={form.aiUsageSummary} onChange={(event) => updateForm('aiUsageSummary', event.target.value)} placeholder={t('Ex.: suporte utiliza IA para preparar respostas.', 'Example: support uses AI to draft replies.')} className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /></div></div>;
    if (activeStep.id === 'first-ai-system') return <div className="grid gap-5 md:grid-cols-2"><div className="space-y-3"><Label htmlFor="ai-system-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Nome do sistema de IA', 'AI system name')}</Label><Input id="ai-system-name" value={form.aiSystemName} onChange={(event) => updateForm('aiSystemName', event.target.value)} placeholder="Customer Support Copilot" className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /></div><div className="space-y-3"><Label htmlFor="owner-team" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Equipa responsável', 'Owner team')}</Label><Input id="owner-team" value={form.ownerTeam} onChange={(event) => updateForm('ownerTeam', event.target.value)} placeholder="Operations / Support" className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /></div><div className="space-y-3 md:col-span-2"><Label htmlFor="ai-system-use-case" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Caso de utilização', 'Use case')}</Label><Input id="ai-system-use-case" value={form.aiSystemUseCase} onChange={(event) => updateForm('aiSystemUseCase', event.target.value)} placeholder={t('Resume pedidos e sugere respostas para revisão humana.', 'Summarises support tickets and suggests draft replies to agents.')} className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /></div><div className="space-y-3"><Label htmlFor="vendor-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Fornecedor ou modelo', 'Vendor or model provider')} <span className="normal-case tracking-normal text-slate-600">({copy.optional})</span></Label><Input id="vendor-name" value={form.vendorName} onChange={(event) => updateForm('vendorName', event.target.value)} placeholder="OpenAI, Anthropic, internal model..." className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /></div>{renderSelect(t('Estado do ciclo de vida', 'Lifecycle status'), form.lifecycleStatus, AI_SYSTEM_STATUSES, { planned: 'Planned', pilot: 'Pilot', production: 'Production', retired: 'Retired' }, (value) => updateForm('lifecycleStatus', value))}</div>;
    if (activeStep.id === 'risk-classification') {
      const riskSignals: Array<[keyof Pick<WizardFormState, 'usesPersonalData' | 'interactsWithPeople' | 'generatesContent' | 'biometricIdentification' | 'manipulativeOrExploitative'>, string]> = [['usesPersonalData', t('Processa dados pessoais', 'Processes personal data')], ['interactsWithPeople', t('Interage diretamente com pessoas', 'Interacts directly with people')], ['generatesContent', t('Gera conteúdo ou recomendações', 'Generates content or recommendations')], ['biometricIdentification', t('Utiliza identificação ou categorização biométrica', 'Uses biometric identification/categorisation')], ['manipulativeOrExploitative', t('Possível padrão de utilização proibida', 'Potential prohibited-use pattern')]];
      return <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2">{renderSelect(t('Papel da organização', 'Organization role'), form.role, AI_SYSTEM_ROLES, { provider: 'Provider', deployer: 'Deployer', importer: 'Importer', distributor: 'Distributor', other: 'Other' }, (value) => updateForm('role', value))}{renderSelect(t('Domínio de risco', 'Risk domain'), form.riskDomain, AI_RISK_DOMAINS, Object.fromEntries(AI_RISK_DOMAINS.map((domain) => [domain, domain.replaceAll('_', ' ')])) as Record<WizardFormState['riskDomain'], string>, (value) => updateForm('riskDomain', value))}</div><div className="grid gap-3 md:grid-cols-2">{riskSignals.map(([key, label]) => { const checked = form[key]; return <label key={key} className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? 'border-emerald-300/30 bg-emerald-300/[0.07]' : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.035]'}`}><input type="checkbox" className="sr-only" checked={checked} onChange={(event) => updateForm(key, event.target.checked)} /><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-emerald-300 bg-emerald-300 text-[#03110c]' : 'border-white/20 text-transparent'}`}><Check className="h-3.5 w-3.5" /></span><span className="text-sm leading-6 text-slate-300">{label}</span></label>; })}</div><div className="flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80"><Radar className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><p>Initial classification: <strong className="text-amber-100">{getRiskLevelLabel(riskLevel)}</strong>. {t('Pode refinar esta classificação mais tarde no inventário.', 'You can refine this later in the AI systems inventory.')}</p></div></div>;
    }
    if (activeStep.id === 'readiness-score') return <div className="grid gap-5 lg:grid-cols-[220px_1fr]"><div className="flex items-center justify-center rounded-3xl border border-white/8 bg-white/[0.025] p-6"><div className="relative flex h-36 w-36 items-center justify-center rounded-full p-[10px]" style={{ background: `conic-gradient(#58f0bd ${readinessScore * 3.6}deg, rgba(148,163,184,.12) 0deg)` }}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07101a] shadow-[inset_0_0_35px_rgba(0,0,0,.45)]"><span className="text-4xl font-semibold tracking-[-0.05em] text-white">{readinessScore}</span><span className="text-xs text-slate-500">/100</span></div></div></div><div className="rounded-3xl border border-white/8 bg-white/[0.025] p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">{t('Leitura inicial', 'Initial operating posture')}</p><h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{t('Score baseado em dados reais da configuração', 'Score generated from real setup data')}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{t('A pontuação combina perfil da organização, utilização de IA, primeiro sistema, sinais de risco, documentos, tarefas e equipa.', 'The score combines organization profile, AI usage, first system, risk signals, documents, tasks and team invitations.')}</p><div className="mt-6 grid grid-cols-3 gap-3">{[[recommendedDocuments.length, t('Documentos', 'Documents')], [suggestedTasks.length, t('Tarefas', 'Tasks')], [inviteEmails.length, t('Convites', 'Invites')]].map(([value, label]) => <div key={String(label)} className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-slate-500">{label}</p></div>)}</div></div></div>;
    if (activeStep.id === 'documents') return <div className="grid gap-4 md:grid-cols-2">{recommendedDocuments.map((document, index) => <article key={document.id} className="group rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"><div className="flex items-center justify-between gap-3"><div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-2 text-cyan-200"><FileCheck2 className="h-4 w-4" /></div><Badge variant="outline" className="rounded-full border-white/10 bg-black/20 text-[10px] uppercase tracking-[0.12em] text-slate-400">{document.priority}</Badge></div><p className="mt-5 text-xs text-slate-600">{String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 font-medium text-white">{document.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{document.reason}</p></article>)}</div>;
    if (activeStep.id === 'tasks') return <div className="space-y-3">{suggestedTasks.map((task, index) => <article key={task.id} className="grid gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:grid-cols-[44px_1fr_auto] sm:items-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] text-sm font-semibold text-emerald-200">{String(index + 1).padStart(2, '0')}</div><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="rounded-full border-white/10 bg-black/20 text-[10px] uppercase tracking-[0.12em] text-slate-400">{task.priority}</Badge><span className="text-xs text-slate-600">Due in {task.dueInDays} days</span></div><h3 className="mt-2 font-medium text-white">{task.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{task.description}</p></div><div className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-500 sm:flex"><ArrowRight className="h-4 w-4" /></div></article>)}</div>;
    if (activeStep.id === 'team') return <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]"><div className="space-y-3"><Label htmlFor="invite-emails" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('Convidar colegas', 'Invite teammates')} <span className="normal-case tracking-normal text-slate-600">({copy.optional})</span></Label><Input id="invite-emails" value={form.inviteEmailText} onChange={(event) => updateForm('inviteEmailText', event.target.value)} placeholder="legal@company.com, security@company.com" className="h-12 rounded-xl border-white/10 bg-[#07101a] px-4 text-white placeholder:text-slate-600 focus-visible:ring-emerald-300/30" /><p className="text-sm leading-6 text-slate-500">{t('Separe vários emails por vírgulas, ponto e vírgula ou novas linhas.', 'Separate multiple emails with commas, semicolons or new lines.')}</p>{inviteEmails.length > 0 ? <p className="flex items-center gap-2 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />{inviteEmails.length} invitation{inviteEmails.length === 1 ? '' : 's'} will be created.</p> : null}</div><div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><Users className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm font-medium text-white">{t('Responsabilidade partilhada', 'Shared accountability')}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t('Adicione responsáveis de jurídico, segurança, produto ou operações quando estiver pronto.', 'Add owners from legal, security, product or operations when you are ready.')}</p></div></div>;
    return <div className="grid gap-4 md:grid-cols-2">{PLAN_INTENTS.map((plan) => { const selected = form.selectedPlan === plan; return <button key={plan} type="button" onClick={() => updateForm('selectedPlan', plan)} className={`rounded-2xl border p-5 text-left transition ${selected ? 'border-emerald-300/35 bg-emerald-300/[0.075] shadow-[0_18px_50px_rgba(16,185,129,.07)]' : 'border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]'}`}><div className="flex items-center justify-between gap-3"><span className="font-medium text-white">{planLabels[plan]}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-emerald-300 bg-emerald-300 text-[#03110c]' : 'border-white/15 text-transparent'}`}><Check className="h-4 w-4" /></span></div><p className="mt-3 text-sm leading-6 text-slate-500">{plan === 'trial' ? t('Continue a explorar e escolha a faturação mais tarde.', 'Keep exploring now and choose billing later.') : t('Continue para o dashboard com este plano selecionado para revisão.', 'Continue to dashboard with this plan selected for billing review.')}</p></button>; })}</div>;
  }

  const nextSteps = stepDefinitions.slice(stepIndex, stepIndex + 4);
  const ActiveIcon = activeStep.icon;

  return <div className="dark min-h-screen bg-[#03070b] text-white"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_9%_10%,rgba(14,165,233,.12),transparent_27rem),radial-gradient(circle_at_88%_8%,rgba(16,185,129,.12),transparent_31rem),linear-gradient(180deg,#03070b_0%,#050a11_46%,#020508_100%)]" /><div className="pointer-events-none fixed inset-0 tech-grid opacity-[0.12]" />
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#040910]/88 backdrop-blur-2xl"><div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.065] text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,.08)]"><Fingerprint className="h-5 w-5" /></span><span className="hidden text-sm font-semibold tracking-[0.08em] text-white sm:inline">RISCK COMPLY</span></div><div className="hidden h-7 w-px bg-white/10 md:block" /><div className="hidden min-w-0 md:block"><p className="truncate text-sm font-medium text-slate-200">Onboarding</p><p className="truncate text-xs text-slate-600">{t('Configuração inicial', 'Initial configuration')}</p></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-300/[0.04] px-3 py-2 text-xs text-emerald-100/70 lg:flex"><LockKeyhole className="h-3.5 w-3.5" />{t('Sessão protegida', 'Protected session')}</div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/15 hover:bg-white/[0.05]"><CircleHelp className="h-4 w-4" /><span className="hidden sm:inline">{t('Centro de ajuda', 'Help center')}</span></button><button type="button" aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-400 transition hover:text-white"><Bell className="h-4 w-4" /></button></div></div></header>
    <main className="relative mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="xl:sticky xl:top-[84px] xl:self-start"><div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07101a]/88 shadow-[0_30px_90px_rgba(0,0,0,.24)] backdrop-blur-xl"><div className="border-b border-white/[0.07] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{t('A sua jornada', 'Your setup journey')}</p><div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-2xl font-semibold tracking-[-0.04em] text-white">{stepIndex + 1}<span className="text-base text-slate-600">/{stepDefinitions.length}</span></p><p className="mt-1 text-xs text-slate-500">{t('etapa atual', 'current stage')}</p></div><span className="text-sm font-semibold text-emerald-200">{progress}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#4ade80)] transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-slate-500">{t(`Etapa ${stepIndex + 1} de ${stepDefinitions.length}`, `Step ${stepIndex + 1} of ${stepDefinitions.length}`)}<span className="sr-only">Step {stepIndex + 1} of {stepDefinitions.length}</span></p></div><nav aria-label="Onboarding steps" className="max-h-[calc(100vh-300px)] space-y-1.5 overflow-y-auto p-3 [scrollbar-width:thin]">{stepDefinitions.map((step, index) => { const Icon = step.icon; const isActive = index === stepIndex; const isComplete = index < stepIndex; const label = isPt ? stepCopy[step.id].pt : stepCopy[step.id].en; return <button key={step.id} type="button" onClick={() => { setError(null); setStepIndex(index); }} aria-current={isActive ? 'step' : undefined} title={isPt ? stepCopy[step.id].descriptionPt : stepCopy[step.id].descriptionEn} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${isActive ? 'border-emerald-300/30 bg-emerald-300/[0.075] text-white shadow-[0_10px_30px_rgba(16,185,129,.055)]' : 'border-transparent text-slate-500 hover:border-white/[0.07] hover:bg-white/[0.025] hover:text-slate-300'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isActive ? 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200' : isComplete ? 'border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-300/70' : 'border-white/[0.08] bg-black/10 text-slate-600'}`}>{isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="truncate">{label}</span></button>; })}</nav></div><div className="mt-4 hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 xl:block"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" /><div><p className="text-sm font-medium text-slate-200">{t('Governança desde o primeiro registo', 'Governance from the first record')}</p><p className="mt-2 text-xs leading-5 text-slate-600">{t('Os dados desta configuração alimentam o inventário, tarefas e evidências iniciais.', 'Setup data feeds the first inventory, tasks and evidence records.')}</p></div></div></div></aside>
      <section className="min-w-0 space-y-5" aria-labelledby="onboarding-workspace-title"><div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(9,19,31,.96),rgba(5,13,22,.9))] p-6 shadow-[0_35px_100px_rgba(0,0,0,.28)] sm:p-8"><div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,.14),transparent_18rem)]" /><div className="pointer-events-none absolute right-8 top-1/2 h-36 w-72 -translate-y-1/2 opacity-30 [background-image:repeating-linear-gradient(165deg,transparent_0_8px,rgba(94,234,212,.24)_9px,transparent_10px_18px)] [mask-image:linear-gradient(to_left,black,transparent)]" /><div className="relative max-w-3xl"><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80"><Sparkles className="h-3.5 w-3.5" />{copy.badge}</span><span className="rounded-full border border-white/[0.08] bg-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{planLabels[form.selectedPlan]}</span></div><h1 id="onboarding-workspace-title" className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-4xl lg:text-[2.75rem]">{copy.title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{copy.subtitle}</p><div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500">{[t('Dados estruturados', 'Structured data'), t('Progresso guardável', 'Saveable progress'), t('Sem bloqueio desnecessário', 'No unnecessary blocking')].map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/70" />{item}</span>)}</div></div></div>
        <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#08111c]/94 shadow-[0_35px_100px_rgba(0,0,0,.28)]"><div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-200"><ActiveIcon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">{t(`Etapa ${stepIndex + 1}`, `Stage ${stepIndex + 1}`)}</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white">{displayStepTitle}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{displayStepDescription}</p></div></div><div className="inline-flex items-center gap-3 self-start rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2 sm:self-auto"><Gauge className="h-4 w-4 text-emerald-200" /><div><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{t('Score atual', 'Score preview')}</p><p className="text-sm font-semibold text-white">{readinessScore}/100</p></div></div></div><div className="p-5 sm:p-7">{renderStepContent()}{error ? <div role="alert" className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">{error}</div> : null}{status === 'saved' ? <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">{copy.saved}</div> : null}{status === 'success' ? <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">{copy.success}</div> : null}<div className="mt-7 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isBusy} className="h-11 rounded-xl border-white/10 bg-white/[0.025] px-4 text-slate-200 hover:bg-white/[0.06] hover:text-white">{status === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{status === 'saving' ? copy.saving : copy.save}</Button><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => { setError(null); setStepIndex((current) => Math.max(0, current - 1)); }} disabled={isBusy || stepIndex === 0} className="h-11 rounded-xl border-white/10 bg-white/[0.025] px-4 text-slate-300 hover:bg-white/[0.06] hover:text-white"><ChevronLeft className="mr-1 h-4 w-4" />{copy.back}</Button>{stepIndex < stepDefinitions.length - 1 ? <Button type="button" onClick={goNext} disabled={isBusy} className="h-11 rounded-xl border border-emerald-100/20 bg-[linear-gradient(180deg,#b8f7db,#5ee7b7)] px-5 font-semibold text-[#04110c] shadow-[0_12px_35px_rgba(16,185,129,.14)] hover:bg-emerald-200">{copy.continue}<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={handleComplete} disabled={isBusy} className="h-11 rounded-xl border border-emerald-100/20 bg-[linear-gradient(180deg,#b8f7db,#5ee7b7)] px-5 font-semibold text-[#04110c] shadow-[0_12px_35px_rgba(16,185,129,.14)] hover:bg-emerald-200">{status === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{status === 'submitting' ? copy.finishing : copy.finish}</Button>}</div></div></div></div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck, t('Controlo por função', 'Role-based control'), t('Responsabilidades claras desde o início.', 'Clear ownership from the start.')], [Globe2, t('Contexto europeu', 'European context'), t('País, setor e função orientam o setup.', 'Country, sector and role guide setup.')], [Activity, t('Ativação progressiva', 'Progressive activation'), t('Guarde e retome sem perder contexto.', 'Save and resume without losing context.')], [BookOpenCheck, t('Evidência operacional', 'Operational evidence'), t('Dados estruturados para revisão posterior.', 'Structured data ready for later review.')]].map(([Icon, title, description]) => { const AssuranceIcon = Icon as typeof ShieldCheck; return <div key={String(title)} className="bg-[#07101a] p-5"><AssuranceIcon className="h-5 w-5 text-cyan-200/80" /><p className="mt-4 text-sm font-medium text-slate-200">{String(title)}</p><p className="mt-2 text-xs leading-5 text-slate-600">{String(description)}</p></div>; })}</div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">{t('Percurso operacional', 'Operating journey')}</p><p className="mt-2 text-sm text-slate-300">{t('Da fundação à execução contínua', 'From foundation to continuous execution')}</p></div><Settings2 className="h-5 w-5 text-slate-600" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[[t('Fundação', 'Foundation'), '1–2 min'], [t('Avaliação', 'Assessment'), '5–10 min'], [t('Configuração', 'Configuration'), '10–15 min'], [t('Documentação', 'Documentation'), '10–15 min'], [t('Execução', 'Execution'), t('Contínuo', 'Ongoing')], [t('Otimização', 'Optimization'), t('Contínuo', 'Ongoing')]].map(([label, timing], index) => <div key={String(label)} className="relative rounded-xl border border-white/[0.07] bg-black/10 p-3"><span className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs ${index === 0 ? 'border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-200' : 'border-white/[0.08] text-slate-600'}`}>{index + 1}</span><p className="mt-3 text-xs font-medium text-slate-300">{label}</p><p className="mt-1 text-[10px] text-slate-600">{timing}</p></div>)}</div></div></section>
      <aside className="space-y-4 xl:sticky xl:top-[84px] xl:self-start"><div className="rounded-3xl border border-white/[0.08] bg-[#07101a]/88 p-5 shadow-[0_30px_90px_rgba(0,0,0,.22)] backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Score de prontidão', 'Readiness score')}</p><div className="mt-5 flex items-center gap-5"><div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-[8px]" style={{ background: `conic-gradient(#58f0bd ${readinessScore * 3.6}deg, rgba(148,163,184,.12) 0deg)` }}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#07101a]"><span className="text-3xl font-semibold tracking-[-0.05em] text-white">{readinessScore}</span><span className="text-[10px] text-slate-600">/100</span></div></div><div><p className="text-sm font-medium text-white">{readinessScore >= 70 ? t('Boa base operacional', 'Strong operating base') : t('Configuração em progresso', 'Setup in progress')}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t('O score evolui à medida que adiciona dados reais.', 'The score evolves as real setup data is added.')}</p></div></div></div>
        <div className="rounded-3xl border border-white/[0.08] bg-[#07101a]/88 p-5 shadow-[0_30px_90px_rgba(0,0,0,.18)] backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Sinais gerados', 'Generated signals')}</p><div className="mt-4 grid grid-cols-3 gap-2">{[[recommendedDocuments.length, t('Docs', 'Docs'), FileText], [suggestedTasks.length, t('Tarefas', 'Tasks'), ClipboardCheck], [inviteEmails.length, t('Convites', 'Invites'), Users]].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof FileText; return <div key={String(label)} className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><MetricIcon className="h-4 w-4 text-cyan-200/70" /><p className="mt-4 text-xl font-semibold text-white">{String(value)}</p><p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">{String(label)}</p></div>; })}</div></div>
        <div className="rounded-3xl border border-white/[0.08] bg-[#07101a]/88 p-5 shadow-[0_30px_90px_rgba(0,0,0,.18)] backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Próximas etapas', 'Next stages')}</p><span className="text-xs text-slate-600">{stepIndex + 1}/{stepDefinitions.length}</span></div><div className="mt-4 space-y-3">{nextSteps.map((step, offset) => { const Icon = step.icon; const absoluteIndex = stepIndex + offset; const current = offset === 0; const title = isPt ? stepCopy[step.id].pt : stepCopy[step.id].en; return <div key={step.id} className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${current ? 'border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-200' : 'border-white/[0.08] text-slate-600'}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className={`truncate text-sm ${current ? 'font-medium text-slate-200' : 'text-slate-500'}`}>{title}</p><p className="mt-0.5 text-[10px] text-slate-700">{t(`Etapa ${absoluteIndex + 1}`, `Stage ${absoluteIndex + 1}`)}</p></div>{current ? <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-300/70">{t('Agora', 'Now')}</span> : null}</div>; })}</div></div>
        <div className="rounded-3xl border border-white/[0.08] bg-[#07101a]/88 p-5 shadow-[0_30px_90px_rgba(0,0,0,.18)] backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Estado operacional', 'Operating status')}</p><div className="mt-4 space-y-3">{[[Radar, t('Classificação inicial', 'Initial classification'), getRiskLevelLabel(riskLevel)], [FileCheck2, t('Pacote documental', 'Document pack'), `${recommendedDocuments.length} ${t('sugeridos', 'suggested')}`], [ClipboardCheck, t('Fila de ações', 'Action queue'), `${suggestedTasks.length} ${t('tarefas', 'tasks')}`], [ShieldCheck, t('Plano selecionado', 'Selected plan'), planLabels[form.selectedPlan]]].map(([Icon, label, value]) => { const StatusIcon = Icon as typeof Radar; return <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3"><StatusIcon className="h-4 w-4 shrink-0 text-cyan-200/65" /><div className="min-w-0 flex-1"><p className="text-xs text-slate-600">{String(label)}</p><p className="mt-1 truncate text-sm font-medium text-slate-300">{String(value)}</p></div></div>; })}</div></div></aside>
    </div></main></div>;
}
