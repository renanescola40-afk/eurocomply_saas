'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DocumentDeleteButtonProps = {
  documentId: string;
  documentName: string;
  onDelete: (documentId: string) => Promise<void>;
};

export function DocumentDeleteButton({ documentId, documentName, onDelete }: DocumentDeleteButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${documentName}"? This removes the document record and its stored file.`);

    if (!confirmed) return;

    startTransition(async () => {
      await onDelete(documentId);
    });
  }

  return (
    <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
