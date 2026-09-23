'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PrintableReportButtonProps = {
  label: string;
};

export function PrintableReportButton({ label }: PrintableReportButtonProps) {
  return (
    <Button
      type="button"
      className="rounded-full"
      onClick={() => window.print()}
    >
      {label}
      <Download className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
