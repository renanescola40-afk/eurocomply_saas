'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DeleteRecordButtonProps = {
  id: string;
  label: string;
  resourceName: string;
  onDelete: (id: string) => Promise<void>;
  copy?: {
    delete: string;
    deleting: string;
    confirm: (label: string) => string;
    error: string;
  };
};

export function DeleteRecordButton({ id, label, resourceName, onDelete, copy }: DeleteRecordButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(copy?.confirm(label) ?? `Delete ${resourceName} "${label}"? This action cannot be undone.`);
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await onDelete(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : copy?.error ?? `Could not delete ${resourceName}.`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending} className="focus-visible:ring-2">
        {pending ? copy?.deleting ?? 'Deleting...' : copy?.delete ?? 'Delete'}
      </Button>
      {error ? <p className="max-w-xs text-xs text-red-400" role="alert" aria-live="assertive">{error}</p> : null}
    </div>
  );
}
