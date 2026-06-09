'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DocumentDeleteButtonProps = {
  documentId: string;
  documentName: string;
  onDelete: (documentId: string) => Promise<void>;
};

export function DocumentDeleteButton({ documentId, documentName, onDelete }: DocumentDeleteButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${documentName}"? This removes the document record and its stored file.`);

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      try {
        await onDelete(documentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete document.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
        {pending ? 'Deleting...' : 'Delete'}
      </Button>
      {error ? <p className="max-w-xs text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
