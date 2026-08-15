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

export function CreateDocumentForm({ locale, onSubmit }: { locale: string; onSubmit: (input: UploadDocumentFormInput) => Promise<void> }) {
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
      await onSubmit({ name, category, expiresAt: expiresAt || null, file });
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-busy={loading}>
      <div>
        <h2 className="text-lg font-semibold text-white">{copy.uploadTitle}</h2>
        <p className="mt-1 text-sm text-white/55">{copy.uploadSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="document-name">{copy.nameLabel}</Label>
          <Input id="document-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} required className="focus-visible:ring-2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-category">{copy.categoryLabel}</Label>
          <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} required className="focus-visible:ring-2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-file">{copy.fileLabel}</Label>
          <Input id="document-file" type="file" aria-describedby="document-file-help" accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="focus-visible:ring-2" />
          <p id="document-file-help" className="text-xs text-white/45">{copy.fileHelp}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-expires-at">{copy.expiresLabel}</Label>
          <Input id="document-expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="focus-visible:ring-2" />
        </div>
      </div>

      {error ? <p className="text-sm text-red-300" role="alert" aria-live="assertive">{error}</p> : null}

      <Button type="submit" disabled={loading || !name || !category || !file} className="focus-visible:ring-2">
        {loading ? copy.uploading : copy.upload}
      </Button>
    </form>
  );
}
