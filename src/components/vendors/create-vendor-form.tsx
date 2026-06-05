'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type CreateVendorFormInput = {
  name: string;
  website?: string | null;
  country?: string | null;
  category?: string | null;
  dataAccessLevel: 'none' | 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  dpaSigned: boolean;
};

export function CreateVendorForm({ onCreate }: { onCreate: (input: CreateVendorFormInput) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

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
        await onCreate(input);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create vendor.');
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Add vendor</h2>
        <p className="text-sm text-white/55">Track third-party risk and data access.</p>
      </div>
      <Input name="name" placeholder="Vendor name" required />
      <Input name="website" placeholder="https://vendor.com" />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="country" placeholder="Country" />
        <Input name="category" placeholder="Category" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select name="dataAccessLevel" defaultValue="low" className="rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white">
          <option value="none">No data access</option>
          <option value="low">Low data access</option>
          <option value="medium">Medium data access</option>
          <option value="high">High data access</option>
        </select>
        <select name="riskLevel" defaultValue="medium" className="rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white">
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-white/70">
        <input name="dpaSigned" type="checkbox" />
        DPA signed
      </label>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90">
        {isPending ? 'Adding...' : 'Add vendor'}
      </Button>
    </form>
  );
}
