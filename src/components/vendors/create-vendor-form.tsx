'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';

export type CreateVendorFormInput = {
  name: string;
  website?: string | null;
  country?: string | null;
  category?: string | null;
  dataAccessLevel: 'none' | 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  dpaSigned: boolean;
};

type CreateVendorActionResult = { error?: string } | undefined;

const fieldClass = 'h-10 rounded-lg border-slate-800 bg-[#0d1624] text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-500/30';
const selectClass = 'h-10 w-full rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-200 outline-none transition focus:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-400';

export function CreateVendorForm({ onCreate }: { onCreate: (input: CreateVendorFormInput) => Promise<CreateVendorActionResult> }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const input: CreateVendorFormInput = {
      name: String(formData.get('name') ?? ''),
      website: String(formData.get('website') ?? '') || null,
      country: String(formData.get('country') ?? '') || null,
      category: String(formData.get('category') ?? '') || null,
      dataAccessLevel: String(formData.get('dataAccessLevel') ?? 'low') as CreateVendorFormInput['dataAccessLevel'],
      riskLevel: String(formData.get('riskLevel') ?? 'medium') as CreateVendorFormInput['riskLevel'],
      dpaSigned: formData.get('dpaSigned') === 'on',
    };

    startTransition(async () => {
      try {
        const result = await onCreate(input);
        if (result?.error) {
          setError('Could not create vendor. Please review the details and try again.');
          return;
        }

        captureAnalyticsEvent(analyticsEvents.vendorCreated, {
          source: 'vendor_register',
          path: window.location.pathname,
          count: 1,
        });

        setSuccess('Fornecedor guardado com sucesso.');
      } catch {
        setError('Could not create vendor. Please review the details and try again.');
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-sm font-semibold text-slate-100">Add vendor</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">Track third-party risk and data access.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="vendor-name" className={labelClass}>Vendor name</label>
          <Input id="vendor-name" name="name" placeholder="Vendor name" required className={fieldClass} />
        </div>
        <div>
          <label htmlFor="vendor-website" className={labelClass}>Website</label>
          <Input id="vendor-website" name="website" placeholder="https://vendor.com" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="vendor-country" className={labelClass}>Country</label>
          <Input id="vendor-country" name="country" placeholder="Country" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="vendor-category" className={labelClass}>Category</label>
          <Input id="vendor-category" name="category" placeholder="Category" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="vendor-data-access" className={labelClass}>Data access</label>
          <select id="vendor-data-access" name="dataAccessLevel" defaultValue="low" className={selectClass}>
            <option value="none">No data access</option>
            <option value="low">Low data access</option>
            <option value="medium">Medium data access</option>
            <option value="high">High data access</option>
          </select>
        </div>
        <div>
          <label htmlFor="vendor-risk-level" className={labelClass}>Risk level</label>
          <select id="vendor-risk-level" name="riskLevel" defaultValue="medium" className={selectClass}>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
      </div>

      <label className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-800 bg-[#0d1624] px-3 text-sm text-slate-300">
        <input name="dpaSigned" type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500/30" />
        DPA signed
      </label>

      {error && <p className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200" role="alert">{error}</p>}
      {success && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-200" role="status">{success}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60">
          {isPending ? 'Adding...' : 'Add vendor'}
        </Button>
      </div>
    </form>
  );
}
