'use client';

import { Button } from '@/components/ui/button';

type TeamActionButtonProps = {
  children: React.ReactNode;
  message: string;
  onConfirm?: () => Promise<void> | void;
};

export function TeamActionButton({ children, message, onConfirm }: TeamActionButtonProps) {
  return (
    <Button
      type={onConfirm ? 'button' : 'submit'}
      variant="outline"
      size="sm"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }

        if (onConfirm) {
          event.preventDefault();
          void onConfirm();
        }
      }}
    >
      {children}
    </Button>
  );
}
