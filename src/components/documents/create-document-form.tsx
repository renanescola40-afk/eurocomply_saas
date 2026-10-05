'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';

export type UploadDocumentFormInput = {
  name: string;
  category: string;
  expiresAt?: string | null;
  file: File;
};

const inputClass = 'h-10 rounded-lg border-slate-800 bg-[#0d1624] text-slate-200 placeholder:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500/30';

export type UploadDocumentFormResult = { ok: true } | { ok: false; code: 'invalid_upload' };

export function CreateDocumentForm({ locale, onSubmit }: { locale: string; onSubmit: (input: UploadDocumentFormInput) => Promise<UploadDocumentFormResult> }) {
  const copy = getCoreWorkflowCopy(locale).documents;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);

    if (!file) {
      setError(copy.selectFileError);
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({ name, category, expiresAt: expiresAt || null, file });
      if (!result.ok) {
        setError(copy.uploadError);
        return;
      }
      captureAnalyticsEvent(analyticsEvents.documentUploaded, { source: 'documents_form', count: 1 });
      setName('');
      setCategory('general');
      setExpiresAt('');
      setFile(null);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.uploadError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6" aria-busy={loading}>
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-sm font-semibold text-slate-100">{copy.uploadTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{copy.uploadSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="document-name" className="text-xs font-medium text-slate-400">{copy.nameLabel}</Label>
          <Input id="document-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-category" className="text-xs font-medium text-slate-400">{copy.categoryLabel}</Label>
          <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-file" className="text-xs font-medium text-slate-400">{copy.fileLabel}</Label>
          <Input id="document-file" type="file" aria-describedby="document-file-help" accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className={inputClass} />
          <p id="document-file-help" className="text-xs leading-5 text-slate-600">{copy.fileHelp}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-expires-at" className="text-xs font-medium text-slate-400">{copy.expiresLabel}</Label>
          <Input id="document-expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClass} />
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200" role="alert" aria-live="assertive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !name || !category || !file} className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60">
          {loading ? copy.uploading : copy.upload}
        </Button>
      </div>
    </form>
  );
}
