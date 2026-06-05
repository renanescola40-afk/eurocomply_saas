'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CreateDocumentFormInput = {
  name: string;
  category: string;
  storagePath: string;
  mimeType?: string | null;
  expiresAt?: string | null;
};

export function CreateDocumentForm({ onSubmit }: { onSubmit: (input: CreateDocumentFormInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [storagePath, setStoragePath] = useState('manual-entry');
  const [mimeType, setMimeType] = useState('application/pdf');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        name,
        category,
        storagePath,
        mimeType: mimeType || null,
        expiresAt: expiresAt || null,
      });
      setName('');
      setCategory('general');
      setStoragePath('manual-entry');
      setMimeType('application/pdf');
      setExpiresAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Add compliance document</h2>
        <p className="mt-1 text-sm text-white/55">Register a document record. Secure file upload should be enabled next.</p>
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
          <Label htmlFor="document-storage-path">Storage path</Label>
          <Input id="document-storage-path" value={storagePath} onChange={(event) => setStoragePath(event.target.value)} placeholder="documents/privacy-policy.pdf" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-mime-type">MIME type</Label>
          <Input id="document-mime-type" value={mimeType} onChange={(event) => setMimeType(event.target.value)} placeholder="application/pdf" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-expires-at">Expiration date</Label>
          <Input id="document-expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <Button type="submit" disabled={loading || !name || !category || !storagePath}>
        {loading ? 'Adding...' : 'Add document'}
      </Button>
    </form>
  );
}
