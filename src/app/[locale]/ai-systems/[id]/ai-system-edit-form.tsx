'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, RefreshCw, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AiSystemRecord } from '@/server/queries/ai-systems';

const roleOptions = ['provider', 'deployer', 'importer', 'distributor', 'other'] as const;
const statusOptions = ['planned', 'pilot', 'production', 'retired'] as const;
const domainOptions = [
  'general_productivity',
  'customer_support',
  'content_generation',
  'biometrics',
  'employment',
  'education',
  'credit_finance',
  'essential_services',
  'law_enforcement',
  'migration_border',
  'justice_democratic_processes',
  'safety_component',
  'critical_infrastructure',
] as const;

const enterpriseCopy = {
  en: {
    title: 'Enterprise readiness workflows',
    subtitle: 'Create real evidence, vendor and risk workflow records. Every action persists to Supabase and writes an activity event.',
    evidenceTitle: 'Evidence Pack Builder',
    evidenceBody: 'Build a procurement review evidence package from this AI system and current readiness signals.',
    packName: 'Pack title',
    buildPack: 'Create evidence pack',
    vendorTitle: 'Vendor Due Diligence Checklist',
    vendorBody: 'Start a structured vendor review for model/provider, security, retention and AI Act duties.',
    vendorName: 'Vendor name',
    vendorNotes: 'Vendor notes',
    startVendor: 'Start vendor review',
    riskTitle: 'Risk Review Workflow',
    riskBody: 'Open a risk review with due date and decision trail for high-risk or sensitive systems.',
    dueDate: 'Due date',
    riskNotes: 'Risk review notes',
    startRisk: 'Open risk review',
    reportTitle: 'Executive Readiness Report signals',
    reportBody: 'Leadership review summary generated from actual system facts, not a fake compliance claim.',
    success: 'Workflow created and recorded.',
    error: 'Could not create workflow.',
    loading: 'Creating...',
    emptyVendor: 'No vendor is set yet. Add a vendor above before starting diligence.',
    saveSuccess: 'System reassessed and saved.',
    saveError: 'Could not save reassessment.',
  },
  pt: {
    title: 'Workflows enterprise de readiness',
    subtitle: 'Crie registros reais de evidência, fornecedor e risco. Cada ação persiste no Supabase e escreve um evento de atividade.',
    evidenceTitle: 'Evidence Pack Builder',
    evidenceBody: 'Crie um pacote de evidências para revisão de procurement a partir deste sistema de IA e dos sinais atuais de readiness.',
    packName: 'Título do pack',
    buildPack: 'Criar evidence pack',
    vendorTitle: 'Checklist de due diligence de fornecedor',
    vendorBody: 'Inicie uma revisão estruturada de fornecedor/modelo, segurança, retenção e deveres do AI Act.',
    vendorName: 'Nome do fornecedor',
    vendorNotes: 'Notas do fornecedor',
    startVendor: 'Iniciar revisão de fornecedor',
    riskTitle: 'Workflow de revisão de risco',
    riskBody: 'Abra uma revisão de risco com prazo e trilha de decisão para sistemas sensíveis ou de alto risco.',
    dueDate: 'Data limite',
    riskNotes: 'Notas da revisão de risco',
    startRisk: 'Abrir revisão de risco',
    reportTitle: 'Sinais do relatório executivo',
    reportBody: 'Resumo para liderança gerado a partir de fatos reais do sistema, sem claim falso de compliance.',
    success: 'Workflow criado e registrado.',
    error: 'Não foi possível criar o workflow.',
    loading: 'A criar...',
    emptyVendor: 'Nenhum fornecedor definido. Adicione um fornecedor acima antes da due diligence.',
    saveSuccess: 'Sistema reavaliado e guardado.',
    saveError: 'Não foi possível guardar a reavaliação.',
  },
} as const;

type AiSystemEditFormProps = {
  system: AiSystemRecord;
  locale?: string;
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

function initialForm(system: AiSystemRecord): FormState {
  return {
    name: system.name,
    ownerTeam: system.owner_team ?? '',
    category: system.category ?? '',
    countryMarket: system.country_market ?? '',
    processedData: system.processed_data ?? '',
    vendorName: system.vendor_name ?? '',
    modelName: system.model_name ?? '',
    useCase: system.use_case,
    role: system.role,
    lifecycleStatus: system.lifecycle_status,
    riskDomain: system.risk_domain,
    usesPersonalData: system.uses_personal_data,
    interactsWithPeople: system.interacts_with_people,
    generatesContent: system.generates_content,
    biometricIdentification: system.biometric_identification,
    manipulativeOrExploitative: system.manipulative_or_exploitative,
  };
}

function getCopy(locale?: string) {
  return locale === 'pt' ? enterpriseCopy.pt : enterpriseCopy.en;
}

export function AiSystemEditForm({ system, locale }: AiSystemEditFormProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const [form, setForm] = useState<FormState>(() => initialForm(system));
  const [isSaving, setIsSaving] = useState(false);
  const [isWorkflowSaving, setIsWorkflowSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [packTitle, setPackTitle] = useState(`${system.name} AI Act readiness evidence pack`);
  const [vendorRiskLevel, setVendorRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>(system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review' ? 'high' : 'medium');
  const [vendorNotes, setVendorNotes] = useState('');
  const [riskDueAt, setRiskDueAt] = useState('');
  const [riskNotes, setRiskNotes] = useState('');

  const executiveSignals = useMemo(() => {
    return [
      ['AI system', system.name],
      ['Risk level', system.risk_level],
      ['Market', form.countryMarket || 'EU'],
      ['Vendor', form.vendorName || 'Not set'],
      ['Obligations', String(system.obligations.length)],
      ['Next actions', String(system.next_actions.length)],
    ];
  }, [form.countryMarket, form.vendorName, system]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/ai-systems/${system.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ type: 'error', message: payload?.message ?? t.saveError });
        return;
      }

      setNotice({ type: 'success', message: t.saveSuccess });
      router.refresh();
    } catch {
      setNotice({ type: 'error', message: t.saveError });
    } finally {
      setIsSaving(false);
    }
  }

  async function submitWorkflow(event: FormEvent<HTMLFormElement>, workflow: 'evidence_pack' | 'vendor_due_diligence' | 'risk_review', body: Record<string, unknown>) {
    event.preventDefault();
    setIsWorkflowSaving(true);
    setWorkflowNotice(null);

    try {
      const response = await fetch(`/api/ai-systems?workflow=${workflow}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setWorkflowNotice({ type: 'error', message: t.error });
        return;
      }

      setWorkflowNotice({ type: 'success', message: t.success });
      router.refresh();
    } catch {
      setWorkflowNotice({ type: 'error', message: t.error });
    } finally {
      setIsWorkflowSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Edit and reassess</h2>
          <p className="mt-1 text-sm text-white/55">Update the facts, then recalculate risk and append a history event. This is readiness support, not a legal determination.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="System name" aria-label="System name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <input value={form.ownerTeam} onChange={(event) => update('ownerTeam', event.target.value)} placeholder="Owner team" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Category" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <input value={form.countryMarket} onChange={(event) => update('countryMarket', event.target.value)} placeholder="Country / market" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder="Vendor" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <input value={form.modelName} onChange={(event) => update('modelName', event.target.value)} placeholder="Model" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
          <select value={form.role} onChange={(event) => update('role', event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" aria-label="Organization role">
            {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={form.lifecycleStatus} onChange={(event) => update('lifecycleStatus', event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" aria-label="Lifecycle status">
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={form.riskDomain} onChange={(event) => update('riskDomain', event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40 md:col-span-2" aria-label="Risk domain">
            {domainOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <textarea value={form.processedData} onChange={(event) => update('processedData', event.target.value)} placeholder="Data processed" className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40 md:col-span-2" />
          <textarea required minLength={8} value={form.useCase} onChange={(event) => update('useCase', event.target.value)} placeholder="Use case" className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40 md:col-span-2" />
        </div>

        <fieldset className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
          <legend className="px-2 text-sm font-medium text-white/70">Risk signals</legend>
          {[
            ['usesPersonalData', 'Processes personal data'],
            ['interactsWithPeople', 'Interacts directly with people'],
            ['generatesContent', 'Generates content or decisions'],
            ['biometricIdentification', 'Biometric identification or categorisation'],
            ['manipulativeOrExploitative', 'Potential prohibited-practice review'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <input type="checkbox" checked={Boolean(form[key as keyof FormState])} onChange={(event) => update(key as keyof FormState, event.target.checked as never)} className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        {notice ? (
          <div role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
            {notice.type === 'success' ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
            {notice.message}
          </div>
        ) : null}

        <Button type="submit" disabled={isSaving} className="mt-5 rounded-full">
          <RefreshCw className="h-4 w-4" />{isSaving ? 'Saving...' : 'Save reassessment'}
        </Button>
      </form>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" aria-labelledby="enterprise-workflows-title">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/60">Supabase · RBAC · activity history</p>
          <h2 id="enterprise-workflows-title" className="mt-2 text-xl font-semibold">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-white/55">{t.subtitle}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <form onSubmit={(event) => submitWorkflow(event, 'evidence_pack', { title: packTitle, countryScope: [form.countryMarket || system.country_market || 'EU'] })} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <FileText className="h-5 w-5 text-emerald-100" />
            <h3 className="mt-3 font-semibold">{t.evidenceTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{t.evidenceBody}</p>
            <input required minLength={3} value={packTitle} onChange={(event) => setPackTitle(event.target.value)} placeholder={t.packName} className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
            <Button type="submit" disabled={isWorkflowSaving} className="mt-4 rounded-full">{isWorkflowSaving ? t.loading : t.buildPack}</Button>
          </form>

          <form onSubmit={(event) => submitWorkflow(event, 'vendor_due_diligence', { vendorName: form.vendorName, aiSystemId: system.id, riskLevel: vendorRiskLevel, notes: vendorNotes })} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <ClipboardCheck className="h-5 w-5 text-emerald-100" />
            <h3 className="mt-3 font-semibold">{t.vendorTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{form.vendorName ? t.vendorBody : t.emptyVendor}</p>
            <input required minLength={2} value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder={t.vendorName} className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
            <select value={vendorRiskLevel} onChange={(event) => setVendorRiskLevel(event.target.value as typeof vendorRiskLevel)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" aria-label="Vendor risk level">
              {['low', 'medium', 'high', 'critical'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <textarea value={vendorNotes} onChange={(event) => setVendorNotes(event.target.value)} placeholder={t.vendorNotes} className="mt-3 min-h-20 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
            <Button type="submit" disabled={isWorkflowSaving} className="mt-4 rounded-full">{isWorkflowSaving ? t.loading : t.startVendor}</Button>
          </form>

          <form onSubmit={(event) => submitWorkflow(event, 'risk_review', { aiSystemId: system.id, riskLevel: system.risk_level, dueAt: riskDueAt || null, notes: riskNotes })} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-100" />
            <h3 className="mt-3 font-semibold">{t.riskTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{t.riskBody}</p>
            <input type="date" value={riskDueAt} onChange={(event) => setRiskDueAt(event.target.value)} placeholder={t.dueDate} className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
            <textarea value={riskNotes} onChange={(event) => setRiskNotes(event.target.value)} placeholder={t.riskNotes} className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
            <Button type="submit" disabled={isWorkflowSaving} className="mt-4 rounded-full">{isWorkflowSaving ? t.loading : t.startRisk}</Button>
          </form>
        </div>

        {workflowNotice ? (
          <div role={workflowNotice.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm ${workflowNotice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
            {workflowNotice.type === 'success' ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
            {workflowNotice.message}
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="font-semibold">{t.reportTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-white/55">{t.reportBody}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {executiveSignals.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</dt>
                <dd className="mt-1 text-sm text-white/75">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
