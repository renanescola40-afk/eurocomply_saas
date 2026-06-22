'use client';

import { useState } from 'react';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GDPR_DELETE_CONFIRMATION } from '@/server/privacy/gdpr';
import { STEP_UP_TOKEN_HEADER } from '@/server/security/step-up';

export default function PrivacyAdminPage({ params }: { params: { locale: string } }) {
  const [exportToken, setExportToken] = useState('');
  const [deleteToken, setDeleteToken] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState('');

  async function downloadExport() {
    setStatus('');
    const response = await fetch('/api/gdpr/export', {
      headers: exportToken.trim() ? { [STEP_UP_TOKEN_HEADER]: exportToken.trim() } : {},
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error === 'step_up_required' ? 'Step-up obrigatório ou expirado para exportação.' : 'Não foi possível preparar a exportação GDPR.');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eurocomply-gdpr-organization-export.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setStatus('Exportação GDPR descarregada com headers no-store.');
  }

  async function requestDelete() {
    setStatus('');
    const response = await fetch('/api/gdpr/delete-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(deleteToken.trim() ? { [STEP_UP_TOKEN_HEADER]: deleteToken.trim() } : {}),
      },
      body: JSON.stringify({ reason: deleteReason, confirmation }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error === 'step_up_required' ? 'Step-up obrigatório ou expirado para apagamento.' : payload.message ?? 'Não foi possível criar o pedido GDPR.');
      return;
    }

    setStatus(`Pedido criado. Revisão permitida a partir de ${payload.reviewNotBefore ?? 'após safety delay'}.`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.32))]">
      <DashboardCommandNavigation locale={params.locale} activePage="Privacidade" />
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Admin GDPR</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Exportação e pedido de apagamento.</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Fluxo enterprise protegido por RBAC, step-up, tenant scope, audit trail, no-store download e preservação de retenção legal/billing.</p>
        </div>

        {status ? <div className="rounded-2xl border bg-background p-4 text-sm shadow-sm">{status}</div> : null}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Download className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-semibold">Exportar dados da organização</h2>
                <p className="text-sm text-muted-foreground">Use um token step-up emitido para a ação `export_data`.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-medium">
              Token step-up
              <input value={exportToken} onChange={(event) => setExportToken(event.target.value)} placeholder="x-eurocomply-step-up-token" className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <Button type="button" onClick={downloadExport} className="mt-5 rounded-full"><Download className="h-4 w-4" /> Descarregar exportação</Button>
          </section>

          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-destructive/10 p-3 text-destructive"><Trash2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-semibold">Solicitar apagamento GDPR</h2>
                <p className="text-sm text-muted-foreground">Cria pedido pendente; billing/legal/audit chain não são quebrados.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-medium">
              Token step-up para `gdpr_delete`
              <input value={deleteToken} onChange={(event) => setDeleteToken(event.target.value)} className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Razão
              <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Confirmação literal: <code>{GDPR_DELETE_CONFIRMATION}</code>
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <Button type="button" variant="destructive" onClick={requestDelete} className="mt-5 rounded-full"><ShieldCheck className="h-4 w-4" /> Criar pedido pendente</Button>
          </section>
        </div>
      </section>
    </main>
  );
}
