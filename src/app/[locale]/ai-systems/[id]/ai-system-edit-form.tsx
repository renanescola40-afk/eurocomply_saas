'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

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

type AiSystemEditFormProps = {
  system: AiSystemRecord;
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

export function AiSystemEditForm({ system }: AiSystemEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialForm(system));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    const response = await fetch(`/api/ai-systems/${system.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setNotice({ type: 'error', message: payload?.message ?? 'Could not save reassessment.' });
      return;
    }

    setNotice({ type: 'success', message: 'System reassessed and saved.' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Edit and reassess</h2>
        <p className="mt-1 text-sm text-white/55">Update the facts, then recalculate risk and append a history event. This is readiness support, not a legal determination.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="System name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40" />
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
        <div className={`mt-4 rounded-2xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
          {notice.message}
        </div>
      ) : null}

      <Button type="submit" disabled={isSaving} className="mt-5 rounded-full">
        <RefreshCw className="h-4 w-4" />{isSaving ? 'Saving...' : 'Save reassessment'}
      </Button>
    </form>
  );
}
