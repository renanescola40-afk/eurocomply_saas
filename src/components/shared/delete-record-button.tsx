'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DeleteRecordButtonProps = {
  id: string;
  label: string;
  resourceName: string;
  onDelete: (id: string) => Promise<void>;
};

export function DeleteRecordButton({ id, label, resourceName, onDelete }: DeleteRecordButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(`Delete ${resourceName} "${label}"? This action cannot be undone.`);

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      try {
        await onDelete(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not delete ${resourceName}.`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
        {pending ? 'Deleting...' : 'Delete'}
      </Button>
      {error ? <p className="max-w-xs text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
