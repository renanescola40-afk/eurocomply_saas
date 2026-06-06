'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DeleteRecordButtonProps = {
  id: string;
  label: string;
  resourceName: string;
  onDelete: (id: string) => Promise<void>;
};

export function DeleteRecordButton({ id, label, resourceName, onDelete }: DeleteRecordButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Delete ${resourceName} "${label}"? This action cannot be undone.`);

    if (!confirmed) return;

    startTransition(async () => {
      await onDelete(id);
    });
  }

  return (
    <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
