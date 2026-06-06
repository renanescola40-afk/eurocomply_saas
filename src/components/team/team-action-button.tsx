'use client';

import { Button } from '@/components/ui/button';

type TeamActionButtonProps = {
  children: React.ReactNode;
  message: string;
};

export function TeamActionButton({ children, message }: TeamActionButtonProps) {
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
