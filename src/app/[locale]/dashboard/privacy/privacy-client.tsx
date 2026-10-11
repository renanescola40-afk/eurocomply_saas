'use client';

import { useCallback, useState } from 'react';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';

import { StepUpMfaDialog, STEP_UP_TOKEN_HEADER, type StepUpAction } from '@/components/security/step-up-mfa-dialog';
import { Button } from '@/components/ui/button';

const GDPR_DELETE_CONFIRMATION = ['DELETE', 'ORGANIZATION', 'DATA'].join(' ');

type PendingAction = 'export_data' | 'gdpr_delete' | null;

export function PrivacyAdminClient({ locale: _locale }: { locale: string }) {
  const [exportToken, setExportToken] = useState('');
  const [deleteToken, setDeleteToken] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [status, setStatus] = useState('');

  const downloadExport = useCallback(async (token = exportToken) => {
    setStatus('');
    const trimmedToken = token.trim();
    const response = await fetch('/api/gdpr/export', {
      headers: trimmedToken ? { [STEP_UP_TOKEN_HEADER]: trimmedToken } : {},
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error === 'step_up_required' ? 'Step-up verification is required or expired for export.' : 'Could not prepare the GDPR export.');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risck-comply-gdpr-organization-export.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setStatus('GDPR export downloaded with no-store headers.');
  }, [exportToken]);

  const requestDelete = useCallback(async (token = deleteToken) => {
    setStatus('');
    const trimmedToken = token.trim();
    const response = await fetch('/api/gdpr/delete-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(trimmedToken ? { [STEP_UP_TOKEN_HEADER]: trimmedToken } : {}),
      },
      body: JSON.stringify({ reason: deleteReason, confirmation }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error === 'step_up_required' ? 'Step-up verification is required or expired for deletion.' : payload.message ?? 'Could not create the GDPR request.');
      return;
    }

    setStatus(`Request created. Review is permitted from ${payload.reviewNotBefore ?? 'after the safety delay'}.`);
  }, [confirmation, deleteReason, deleteToken]);

  const handleStepUpToken = useCallback((token: string) => {
    const action = pendingAction;
    setPendingAction(null);

    if (action === 'export_data') {
      setExportToken(token);
      void downloadExport(token);
      return;
    }

    if (action === 'gdpr_delete') {
      setDeleteToken(token);
      void requestDelete(token);
    }
  }, [downloadExport, pendingAction, requestDelete]);

  return (
    <section className="min-h-0 space-y-6 bg-transparent text-white">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Admin GDPR</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Export and deletion request</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Enterprise workflow protected by RBAC, step-up verification, tenant scope, audit trail, no-store downloads, and legal/billing retention safeguards.
        </p>
      </header>

      {status ? (
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.07] px-4 py-3 text-sm text-blue-100" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300">
              <Download className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Export organization data</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">The button starts real MFA/IdP step-up verification and downloads the no-store export.</p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-medium text-slate-200">
            Optional manual step-up token
            <input
              value={exportToken}
              onChange={(event) => setExportToken(event.target.value)}
              placeholder="x-eurocomply-step-up-token"
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-[#0d1624] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={() => setPendingAction('export_data')} className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify and download
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadExport()} className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-100 hover:bg-slate-800 hover:text-white">
              <Download className="h-4 w-4" aria-hidden="true" /> Use manual token
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Request GDPR deletion</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Creates a pending request without breaking billing, legal, or audit-chain requirements.</p>
            </div>
          </div>
          <label className="mt-6 block text-sm font-medium text-slate-200">
            Optional manual step-up token para <code className="text-slate-300">gdpr_delete</code>
            <input
              value={deleteToken}
              onChange={(event) => setDeleteToken(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-[#0d1624] px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-200">
            Reason
            <textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-700 bg-[#0d1624] px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-200">
            Literal confirmation: <code className="text-slate-300">{GDPR_DELETE_CONFIRMATION}</code>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-[#0d1624] px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="destructive" onClick={() => setPendingAction('gdpr_delete')} className="h-10 rounded-lg px-4">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify and create request
            </Button>
            <Button type="button" variant="outline" onClick={() => void requestDelete()} className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-100 hover:bg-slate-800 hover:text-white">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Use manual token
            </Button>
          </div>
        </section>
      </div>

      <StepUpMfaDialog
        action={(pendingAction ?? 'export_data') as StepUpAction}
        open={pendingAction !== null}
        title="Enterprise verification required"
        description="Confirm the session with MFA or IdP before exporting or requesting GDPR deletion."
        onCancel={() => setPendingAction(null)}
        onToken={handleStepUpToken}
      />
    </section>
  );
}
