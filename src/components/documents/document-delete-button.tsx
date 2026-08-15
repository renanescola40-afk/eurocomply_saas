'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';

type DocumentDeleteButtonProps = {
  locale: string;
  documentId: string;
  documentName: string;
  onDelete: (documentId: string) => Promise<void>;
};

export function DocumentDeleteButton({ locale, documentId, documentName, onDelete }: DocumentDeleteButtonProps) {
  const copy = getCoreWorkflowCopy(locale).documents;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(copy.deleteConfirm(documentName));
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await onDelete(documentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.deleteError);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending} className="focus-visible:ring-2">
        {pending ? copy.deleting : copy.delete}
      </Button>
      {error ? <p className="max-w-xs text-xs text-red-400" role="alert" aria-live="assertive">{error}</p> : null}
    </div>
  );
}
