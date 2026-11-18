'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type TeamActionButtonProps = {
  children: React.ReactNode;
  message: string;
  onConfirm?: () => Promise<void> | void;
};

export function TeamActionButton({ children, message, onConfirm }: TeamActionButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type={onConfirm ? 'button' : 'submit'}
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async (event) => {
          if (pending) {
            event.preventDefault();
            return;
          }

          if (!window.confirm(message)) {
            event.preventDefault();
            return;
          }

          if (onConfirm) {
            event.preventDefault();
            setError(null);
            setPending(true);
            try {
              await onConfirm();
            } catch (cause) {
              setError(cause instanceof Error && cause.message.trim()
                ? cause.message
                : 'Unable to complete this team action.');
            } finally {
              setPending(false);
            }
          }
        }}
      >
        {children}
      </Button>
      {error ? <p role="alert" className="max-w-xs text-right text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
