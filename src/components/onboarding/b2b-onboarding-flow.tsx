'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, FileText, Loader2, Save, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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

const labelCopy = {
  en: {
    badge: 'Activation onboarding',
    title: 'Launch an AI Act workspace in minutes',
    subtitle: 'Create the tenant, classify the first AI system and leave with a readiness score, document pack and task queue.',
    save: 'Save and continue later',
    saving: 'Saving...',
    saved: 'Progress saved. You can return to onboarding later.',
    continue: 'Continue',
    back: 'Back',
    finish: 'Generate readiness score',
    finishing: 'Generating...',
    success: 'Onboarding completed. Opening dashboard...',
    optional: 'Optional',
  },
  pt: {
    badge: 'Onboarding de ativação',
    title: 'Configure um workspace AI Act em minutos',
    subtitle: 'Crie o tenant, classifique o primeiro sistema de IA e termine com score, documentos e tarefas iniciais.',
    save: 'Guardar e continuar depois',
    saving: 'A guardar...',
    saved: 'Progresso guardado. Pode voltar ao onboarding depois.',
    continue: 'Continuar',
    back: 'Voltar',
    finish: 'Gerar score de prontidão',
    finishing: 'A gerar...',
    success: 'Onboarding concluído. A abrir o dashboard...',
    optional: 'Opcional',
  },
  es: {
    badge: 'Onboarding de activación',
    title: 'Configura un workspace AI Act en minutos',
    subtitle: 'Crea el tenant, clasifica el primer sistema de IA y termina con score, documentos y tareas iniciales.',
    save: 'Guardar y continuar después',
    saving: 'Guardando...',
    saved: 'Progreso guardado. Puedes volver después.',
    continue: 'Continuar',
    back: 'Atrás',
    finish: 'Generar score de preparación',
    finishing: 'Generando...',
    success: 'Onboarding completado. Abriendo dashboard...',
    optional: 'Opcional',
  },
  fr: {
    badge: 'Onboarding activation',
    title: 'Configurez un workspace AI Act en quelques minutes',
    subtitle: 'Créez le tenant, classez le premier système IA et obtenez score, documents et tâches initiales.',
    save: 'Enregistrer et continuer plus tard',
    saving: 'Enregistrement...',
    saved: 'Progression enregistrée. Vous pourrez reprendre plus tard.',
    continue: 'Continuer',
    back: 'Retour',
    finish: 'Générer le score',
    finishing: 'Génération...',
    success: 'Onboarding terminé. Ouverture du dashboard...',
    optional: 'Optionnel',
  },
  it: {
    badge: 'Onboarding di attivazione',
    title: 'Configura un workspace AI Act in pochi minuti',
    subtitle: 'Crea il tenant, classifica il primo sistema IA e ottieni score, documenti e task iniziali.',
    save: 'Salva e continua dopo',
    saving: 'Salvataggio...',
    saved: 'Progressi salvati. Puoi tornare più tardi.',
    continue: 'Continua',
    back: 'Indietro',
    finish: 'Genera readiness score',
    finishing: 'Generazione...',
    success: 'Onboarding completato. Apertura dashboard...',
    optional: 'Opzionale',
  },
  de: {
    badge: 'Aktivierungs-Onboarding',
    title: 'AI-Act-Workspace in Minuten einrichten',
    subtitle: 'Mandant erstellen, erstes KI-System klassifizieren und mit Score, Dokumenten und Aufgaben starten.',
    save: 'Speichern und später fortsetzen',
    saving: 'Speichern...',
    saved: 'Fortschritt gespeichert. Sie können später fortfahren.',
    continue: 'Weiter',
    back: 'Zurück',
    finish: 'Readiness-Score erzeugen',
    finishing: 'Erzeugen...',
    success: 'Onboarding abgeschlossen. Dashboard wird geöffnet...',
    optional: 'Optional',
  },
} as const;

const countryLabels: Record<CountryCode, string> = {
  pt: 'Portugal', es: 'Spain', fr: 'France', de: 'Germany', it: 'Italy', nl: 'Netherlands', be: 'Belgium', ie: 'Ireland', se: 'Sweden', dk: 'Denmark', no: 'Norway', fi: 'Finland', pl: 'Poland', other_eu: 'Other EU country', uk: 'United Kingdom', ch: 'Switzerland',
};

const companyTypeLabels: Record<CompanyType, string> = {
  startup: 'Startup', sme: 'SME', scaleup: 'Scale-up', enterprise: 'Enterprise', agency: 'Agency', consultancy: 'Consultancy', public_sector: 'Public sector', non_profit: 'Non-profit',
};

const sectorLabels: Record<CompanySector, string> = {
  saas: 'SaaS', fintech: 'Fintech', hr_recruiting: 'HR / recruiting', healthcare: 'Healthcare', education: 'Education', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Marketing agency', manufacturing: 'Manufacturing', financial_services: 'Financial services', public_services: 'Public services', other: 'Other',
};

const aiUsageLabels: Record<AiUsageLevel, string> = {
  not_started: 'Not using AI yet', exploring: 'Exploring AI', internal_productivity: 'Internal productivity tools', customer_facing: 'Customer-facing AI', automated_decisions: 'Automated decisions', multiple_systems: 'Multiple AI systems',
};

const planLabels: Record<PlanIntent, string> = {
  trial: 'Continue trial', essential: 'Essential', professional: 'Professional', business: 'Business', enterprise: 'Enterprise',
};

const stepDefinitions = [
  { id: 'create-organization', title: 'Create organization', icon: Building2 },
  { id: 'country', title: 'Choose country', icon: Building2 },
  { id: 'company-type', title: 'Company type', icon: Building2 },
  { id: 'sector', title: 'Sector', icon: Building2 },
  { id: 'ai-usage', title: 'AI usage', icon: ClipboardCheck },
  { id: 'first-ai-system', title: 'First AI system', icon: ShieldCheck },
  { id: 'risk-classification', title: 'Initial risk', icon: ShieldCheck },
  { id: 'readiness-score', title: 'Readiness score', icon: CheckCircle2 },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'tasks', title: 'Tasks', icon: ClipboardCheck },
  { id: 'team', title: 'Invite team', icon: Users },
  { id: 'plan', title: 'Plan or trial', icon: CheckCircle2 },
] as const;

function normalizePlan(value?: string | null): PlanIntent {
  return PLAN_INTENTS.includes(value as PlanIntent) ? (value as PlanIntent) : 'trial';
}

function normalizeCountry(value?: string | null): CountryCode {
  return COUNTRY_CODES.includes(value as CountryCode) ? (value as CountryCode) : 'pt';
}

function normalizeCompanyType(value?: string | null): CompanyType {
  return COMPANY_TYPES.includes(value as CompanyType) ? (value as CompanyType) : 'startup';
}

function normalizeSector(value?: string | null): CompanySector {
  return COMPANY_SECTORS.includes(value as CompanySector) ? (value as CompanySector) : 'saas';
}

function normalizeAiUsage(value?: string | null): AiUsageLevel {
  return AI_USAGE_LEVELS.includes(value as AiUsageLevel) ? (value as AiUsageLevel) : 'exploring';
}

function parseInviteEmails(value: string) {
  return Array.from(new Set(value
    .split(/[\n,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@')))).slice(0, 10);
}

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
    aiUsage: normalizeAiUsage(initialState.latestRun?.selectedPlan ? 'internal_productivity' : null),
    aiUsageSummary: organization?.aiUsageSummary ?? '',
    aiSystemId: firstAiSystem?.id,
    aiSystemName: firstAiSystem?.name ?? '',
    aiSystemUseCase: firstAiSystem?.useCase ?? '',
    ownerTeam: firstAiSystem?.ownerTeam ?? '',
    vendorName: firstAiSystem?.vendorName ?? '',
    role: AI_SYSTEM_ROLES.includes(firstAiSystem?.role as (typeof AI_SYSTEM_ROLES)[number]) ? firstAiSystem?.role as (typeof AI_SYSTEM_ROLES)[number] : 'deployer',
    lifecycleStatus: AI_SYSTEM_STATUSES.includes(firstAiSystem?.lifecycleStatus as (typeof AI_SYSTEM_STATUSES)[number]) ? firstAiSystem?.lifecycleStatus as (typeof AI_SYSTEM_STATUSES)[number] : 'pilot',
    riskDomain: AI_RISK_DOMAINS.includes(firstAiSystem?.riskDomain as (typeof AI_RISK_DOMAINS)[number]) ? firstAiSystem?.riskDomain as (typeof AI_RISK_DOMAINS)[number] : 'general_productivity',
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
  const copy = labelCopy[locale as keyof typeof labelCopy] ?? labelCopy.en;
  const [form, setForm] = useState<WizardFormState>(() => buildInitialForm(initialState, requestedPlan));
  const [stepIndex, setStepIndex] = useState(() => {
    const savedStep = initialState.organization?.onboardingStep;
    const index = stepDefinitions.findIndex((step) => step.id === savedStep);
    return index >= 0 && index < stepDefinitions.length ? index : 0;
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const inviteEmails = useMemo(() => parseInviteEmails(form.inviteEmailText), [form.inviteEmailText]);
  const riskLevel = useMemo(() => inferInitialRiskLevel(form), [form]);
  const recommendedDocuments = useMemo(() => getRecommendedDocuments({
    riskLevel,
    usesPersonalData: form.usesPersonalData,
    interactsWithPeople: form.interactsWithPeople,
    generatesContent: form.generatesContent,
    sector: form.sector,
  }), [form.generatesContent, form.interactsWithPeople, form.sector, form.usesPersonalData, riskLevel]);
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
  }), [form, inviteEmails, readinessScore, recommendedDocuments, riskLevel, suggestedTasks]);

  const activeStep = stepDefinitions[stepIndex];
  const progress = Math.round(((stepIndex + 1) / stepDefinitions.length) * 100);
  const isBusy = status === 'saving' || status === 'submitting' || status === 'success';

  function updateForm<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleOrganizationNameChange(value: string) {
    setForm((current) => ({
      ...current,
      organizationName: value,
      slug: current.slug || slugifyOrganization(value),
    }));
  }

  function validateStep() {
    if (activeStep.id === 'create-organization') return Boolean(form.organizationName.trim().length >= 2 && form.slug.trim().length >= 3);
    if (activeStep.id === 'first-ai-system') return Boolean(form.aiSystemName.trim().length >= 2 && form.aiSystemUseCase.trim().length >= 10 && form.ownerTeam.trim().length >= 2);
    return true;
  }

  async function handleSaveDraft() {
    setError(null);

    if (!form.organizationName || !form.slug) {
      setError('Organization name and slug are required before saving.');
      return;
    }

    setStatus('saving');

    try {
      const result = await onSaveDraft({
        organizationId: form.organizationId,
        organizationName: form.organizationName,
        slug: form.slug,
        country: form.country,
        companyType: form.companyType,
        sector: form.sector,
        aiUsage: form.aiUsage,
        aiUsageSummary: form.aiUsageSummary,
        onboardingStep: activeStep.id,
        selectedPlan: form.selectedPlan,
      });
      setForm((current) => ({ ...current, organizationId: result.organizationId }));
      setStatus('saved');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not save onboarding progress.');
    }
  }

  async function handleComplete() {
    setError(null);
    setStatus('submitting');

    try {
      const result = await onComplete({
        organizationId: form.organizationId,
        organizationName: form.organizationName,
        slug: form.slug,
        country: form.country,
        companyType: form.companyType,
        sector: form.sector,
        aiUsage: form.aiUsage,
        aiUsageSummary: form.aiUsageSummary,
        aiSystemId: form.aiSystemId,
        aiSystemName: form.aiSystemName,
        aiSystemUseCase: form.aiSystemUseCase,
        ownerTeam: form.ownerTeam,
        vendorName: form.vendorName,
        role: form.role,
        lifecycleStatus: form.lifecycleStatus,
        riskDomain: form.riskDomain,
        usesPersonalData: form.usesPersonalData,
        interactsWithPeople: form.interactsWithPeople,
        generatesContent: form.generatesContent,
        biometricIdentification: form.biometricIdentification,
        manipulativeOrExploitative: form.manipulativeOrExploitative,
        inviteEmails,
        selectedPlan: form.selectedPlan,
      });
      setStatus('success');
      router.push(result.dashboardPath ?? `/${locale}/dashboard/organizations?onboarding=completed`);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not complete onboarding.');
    }
  }

  function renderStepContent() {
    switch (activeStep.id) {
      case 'create-organization':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization name</Label>
              <Input id="organization-name" value={form.organizationName} onChange={(event) => handleOrganizationNameChange(event.target.value)} placeholder="Acme Europe Ltd" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-slug">Workspace slug</Label>
              <Input id="organization-slug" value={form.slug} onChange={(event) => updateForm('slug', slugifyOrganization(event.target.value))} placeholder="acme-europe" />
            </div>
          </div>
        );
      case 'country':
        return (
          <div className="space-y-2">
            <Label>Main operating country</Label>
            <Select value={form.country} onValueChange={(value) => updateForm('country', value as CountryCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRY_CODES.map((country) => <SelectItem key={country} value={country}>{countryLabels[country]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case 'company-type':
        return (
          <div className="space-y-2">
            <Label>Company type</Label>
            <Select value={form.companyType} onValueChange={(value) => updateForm('companyType', value as CompanyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPANY_TYPES.map((type) => <SelectItem key={type} value={type}>{companyTypeLabels[type]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case 'sector':
        return (
          <div className="space-y-2">
            <Label>Sector</Label>
            <Select value={form.sector} onValueChange={(value) => updateForm('sector', value as CompanySector)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPANY_SECTORS.map((sector) => <SelectItem key={sector} value={sector}>{sectorLabels[sector]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case 'ai-usage':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current AI usage</Label>
              <Select value={form.aiUsage} onValueChange={(value) => updateForm('aiUsage', value as AiUsageLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AI_USAGE_LEVELS.map((usage) => <SelectItem key={usage} value={usage}>{aiUsageLabels[usage]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-usage-summary">Short context</Label>
              <Input id="ai-usage-summary" value={form.aiUsageSummary} onChange={(event) => updateForm('aiUsageSummary', event.target.value)} placeholder="Example: support team uses ChatGPT to draft replies; marketing generates content." />
            </div>
          </div>
        );
      case 'first-ai-system':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ai-system-name">AI system name</Label>
              <Input id="ai-system-name" value={form.aiSystemName} onChange={(event) => updateForm('aiSystemName', event.target.value)} placeholder="Customer Support Copilot" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-team">Owner team</Label>
              <Input id="owner-team" value={form.ownerTeam} onChange={(event) => updateForm('ownerTeam', event.target.value)} placeholder="Operations / Support" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ai-system-use-case">Use case</Label>
              <Input id="ai-system-use-case" value={form.aiSystemUseCase} onChange={(event) => updateForm('aiSystemUseCase', event.target.value)} placeholder="Summarises support tickets and suggests draft replies to agents." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor or model provider <span className="text-muted-foreground">({copy.optional})</span></Label>
              <Input id="vendor-name" value={form.vendorName} onChange={(event) => updateForm('vendorName', event.target.value)} placeholder="OpenAI, Anthropic, internal model..." />
            </div>
            <div className="space-y-2">
              <Label>Lifecycle status</Label>
              <Select value={form.lifecycleStatus} onValueChange={(value) => updateForm('lifecycleStatus', value as WizardFormState['lifecycleStatus'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AI_SYSTEM_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'risk-classification':
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization role</Label>
                <Select value={form.role} onValueChange={(value) => updateForm('role', value as WizardFormState['role'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AI_SYSTEM_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk domain</Label>
                <Select value={form.riskDomain} onValueChange={(value) => updateForm('riskDomain', value as WizardFormState['riskDomain'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AI_RISK_DOMAINS.map((domain) => <SelectItem key={domain} value={domain}>{domain.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['usesPersonalData', 'Processes personal data'],
                ['interactsWithPeople', 'Interacts directly with people'],
                ['generatesContent', 'Generates content or recommendations'],
                ['biometricIdentification', 'Uses biometric identification/categorisation'],
                ['manipulativeOrExploitative', 'Could manipulate, exploit vulnerability or enable prohibited use'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 rounded-2xl border bg-background p-4 text-sm">
                  <input type="checkbox" className="mt-1" checked={Boolean(form[key as keyof WizardFormState])} onChange={(event) => updateForm(key as keyof WizardFormState, event.target.checked as never)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
              Initial classification: <strong>{getRiskLevelLabel(riskLevel)}</strong>. You can refine this later in the AI systems inventory.
            </div>
          </div>
        );
      case 'readiness-score':
        return (
          <div className="rounded-[2rem] border bg-background p-6">
            <p className="text-sm text-muted-foreground">Initial readiness score</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-6xl font-semibold tracking-tight">{readinessScore}</span>
              <span className="pb-2 text-muted-foreground">/100</span>
            </div>
            <Progress className="mt-5" value={readinessScore} />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">This score is generated from real setup data: organization profile, country, AI usage, first AI system, risk signals, document suggestions, tasks and team invitations.</p>
          </div>
        );
      case 'documents':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendedDocuments.map((document) => (
              <div key={document.id} className="rounded-2xl border bg-background p-4">
                <Badge variant="outline" className="mb-3 rounded-full">{document.priority}</Badge>
                <h3 className="font-medium">{document.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{document.reason}</p>
              </div>
            ))}
          </div>
        );
      case 'tasks':
        return (
          <div className="space-y-3">
            {suggestedTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">{task.priority}</Badge>
                  <span className="text-xs text-muted-foreground">Due in {task.dueInDays} days</span>
                </div>
                <h3 className="mt-3 font-medium">{task.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
              </div>
            ))}
          </div>
        );
      case 'team':
        return (
          <div className="space-y-2">
            <Label htmlFor="invite-emails">Invite teammates <span className="text-muted-foreground">({copy.optional})</span></Label>
            <Input id="invite-emails" value={form.inviteEmailText} onChange={(event) => updateForm('inviteEmailText', event.target.value)} placeholder="legal@company.com, security@company.com" />
            <p className="text-sm text-muted-foreground">Separate multiple emails with commas, semicolons or new lines. The user can continue without inviting anyone.</p>
            {inviteEmails.length > 0 ? <p className="text-sm text-emerald-600">{inviteEmails.length} invitation{inviteEmails.length === 1 ? '' : 's'} will be created.</p> : null}
          </div>
        );
      case 'plan':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {PLAN_INTENTS.map((plan) => (
              <button key={plan} type="button" onClick={() => updateForm('selectedPlan', plan)} className={`rounded-2xl border p-4 text-left transition ${form.selectedPlan === plan ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{planLabels[plan]}</span>
                  {form.selectedPlan === plan ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan === 'trial' ? 'Keep exploring now and choose billing later.' : 'Continue to dashboard with this plan selected for billing review.'}</p>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit rounded-full">{copy.badge}</Badge>
            <CardTitle className="text-xl">{copy.title}</CardTitle>
            <CardDescription>{copy.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Step {stepIndex + 1} of {stepDefinitions.length}</p>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {stepDefinitions.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === stepIndex;
            const isComplete = index < stepIndex;
            return (
              <button key={step.id} type="button" onClick={() => setStepIndex(index)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${isActive ? 'border-primary bg-primary/10 text-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}>
                {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Icon className="h-4 w-4" />}
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <Card className="min-h-[560px]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="outline" className="mb-3 rounded-full">{activeStep.title}</Badge>
              <CardTitle>{activeStep.title}</CardTitle>
            </div>
            <div className="rounded-full border px-3 py-1 text-sm text-muted-foreground">Score preview: {readinessScore}/100</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}

          {error ? <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          {status === 'saved' ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-100">{copy.saved}</div> : null}
          {status === 'success' ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-100">{copy.success}</div> : null}

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isBusy}>
              {status === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {status === 'saving' ? copy.saving : copy.save}
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={isBusy || stepIndex === 0}>{copy.back}</Button>
              {stepIndex < stepDefinitions.length - 1 ? (
                <Button type="button" onClick={() => validateStep() ? setStepIndex((current) => Math.min(stepDefinitions.length - 1, current + 1)) : setError('Complete the required fields before continuing.')} disabled={isBusy}>
                  {copy.continue}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} disabled={isBusy}>
                  {status === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {status === 'submitting' ? copy.finishing : copy.finish}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
