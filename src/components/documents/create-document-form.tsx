'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';

export type UploadDocumentFormInput = {
  name: string;
  category: string;
  expiresAt?: string | null;
  file: File;
};

export function CreateDocumentForm({ onSubmit }: { onSubmit: (input: UploadDocumentFormInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError('Select a document file to upload.');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        name,
        category,
        expiresAt: expiresAt || null,
        file,
      });
      captureAnalyticsEvent(analyticsEvents.documentUploaded, {
        source: 'documents_form',
        count: 1,
      });
      setName('');
      setCategory('general');
      setExpiresAt('');
      setFile(null);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Upload compliance document</h2>
        <p className="mt-1 text-sm text-white/55">Store evidence in a private organization-scoped bucket.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="document-name">Name</Label>
          <Input id="document-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Privacy Policy" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-category">Category</Label>
          <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="DPIA" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-file">File</Label>
          <Input
            id="document-file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
          <p className="text-xs text-white/45">PDF, PNG, JPG, DOCX or XLSX. Max 10MB.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-expires-at">Expiration date</Label>
          <Input id="document-expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <Button type="submit" disabled={loading || !name || !category || !file}>
        {loading ? 'Uploading...' : 'Upload document'}
      </Button>
    </form>
  );
}
