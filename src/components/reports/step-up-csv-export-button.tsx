'use client';

import { useState } from 'react';
import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';

type StepUpCsvExportButtonProps = {
  endpoint: string;
  filename: string;
  label?: string;
  className?: string;
};

type ExportErrorBody = { error?: string; message?: string };

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get('Content-Disposition') ?? '';
  return disposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || fallback;
}

async function errorMessage(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ExportErrorBody;
  if (response.status === 403 && body.error === 'step_up_required') return 'Security verification expired. Verify again to export.';
  if (response.status === 403) return 'You do not have permission to export this report.';
  if (response.status === 402) return body.message ?? 'Your current plan does not include CSV exports.';
  if (response.status === 429) return 'Too many export attempts. Wait a moment and try again.';
  return body.message ?? 'The report could not be exported. Try again.';
}

export function StepUpCsvExportButton({ endpoint, filename, label = 'Export CSV', className }: StepUpCsvExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(token: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { [STEP_UP_TOKEN_HEADER]: token },
      });
      if (!response.ok) {
        setError(await errorMessage(response));
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = responseFilename(response, filename);
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError('The report could not be exported. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          className={className}
          disabled={loading}
          onClick={() => { setError(null); setDialogOpen(true); }}
        >
          {loading ? 'Preparing CSV…' : label}
        </button>
        <p className="max-w-xs text-xs text-rose-500" role="status" aria-live="polite">{error}</p>
      </div>
      <StepUpMfaDialog
        action="export_data"
        open={dialogOpen}
        title="Verify before exporting"
        description="CSV reports contain organization data. Complete MFA or enterprise identity verification to continue."
        onCancel={() => setDialogOpen(false)}
        onToken={(token) => { setDialogOpen(false); void download(token); }}
      />
    </>
  );
}
