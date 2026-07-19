'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, ShieldCheck, XCircle } from 'lucide-react';

type Approval = {
  id: string;
  title: string;
  owner: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  submittedAt: string;
};

type DocumentRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  version?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const fallbackApprovals: Approval[] = [
  { id: 'demo-privacy-policy', title: 'Política de Privacidade v2', owner: 'Compliance Lead', status: 'Pendente', submittedAt: 'Hoje' },
  { id: 'demo-risk-matrix', title: 'Matriz de Riscos GDPR', owner: 'Security Owner', status: 'Pendente', submittedAt: 'Ontem' },
  { id: 'demo-vendor-review', title: 'Ata de Revisão de Fornecedores', owner: 'Legal Counsel', status: 'Aprovado', submittedAt: 'Esta semana' },
];

function normalizeApprovalStatus(status?: string | null): Approval['status'] {
  const value = String(status ?? '').toLowerCase();

  if (value.includes('approved') || value.includes('aprov')) {
    return 'Aprovado';
  }

  if (value.includes('reject') || value.includes('rejeit')) {
    return 'Rejeitado';
  }

  return 'Pendente';
}

function formatSubmittedAt(value?: string | null) {
  if (!value) {
    return 'Sem data';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }

  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function mapDocumentsToApprovals(documents: DocumentRecord[]): Approval[] {
  return documents.map((document) => ({
    id: document.id,
    title: `${document.title ?? 'Documento controlado'}${document.version ? ` v${document.version}` : ''}`,
    owner: 'Compliance workflow',
    status: normalizeApprovalStatus(document.status),
    submittedAt: formatSubmittedAt(document.updated_at ?? document.created_at),
  }));
}

export default function ApprovalsClient({ locale, initialDocuments = [] }: { locale: string; initialDocuments?: DocumentRecord[] }) {
  const [approvals, setApprovals] = useState<Approval[]>(() => {
    const mapped = mapDocumentsToApprovals(initialDocuments);
    return mapped.length > 0 ? mapped : fallbackApprovals;
  });
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(() => approvals.filter((item) => item.status === 'Pendente').length, [approvals]);
  const isUsingRealDocuments = initialDocuments.length > 0;

  const updateStatus = async (id: string, status: Approval['status']) => {
    setBusyId(id);
    setToast('');

    const action = status === 'Aprovado' ? 'approve' : 'reject';

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: status === 'Aprovado' ? 'Approved from workflow page' : 'Rejected from workflow page' }),
      });

      const payload = await response.json().catch(() => null) as { persisted?: boolean; error?: string } | null;

      if (!response.ok) {
        setToast(payload?.error ?? 'Não foi possível atualizar a aprovação.');
        return;
      }

      setApprovals((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
      setToast(
        status === 'Aprovado'
          ? payload?.persisted
            ? 'Documento aprovado e persistido no workflow.'
            : 'Documento aprovado na interface e registado como evento de auditoria.'
          : payload?.persisted
            ? 'Documento rejeitado e persistido no workflow.'
            : 'Documento rejeitado na interface e registado como evento de auditoria.',
      );
    } catch {
      setToast('Falha de rede ao atualizar aprovação. Tente novamente.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Workflow</p>
            <h1 className="mt-2 text-3xl font-semibold">Gestão de Aprovações</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Aprove ou rejeite documentos controlados antes de entrarem no pacote de auditoria.
            </p>
          </div>
          <Link href={`/${locale}/dashboard/organizations/documents`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-300/50 hover:bg-emerald-300/10">
            Ver documentos
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          {isUsingRealDocuments ? 'A mostrar documentos reais da organização.' : 'Sem documentos reais disponíveis: a mostrar workflow demo seguro.'}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <Clock3 className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold">{pendingCount}</p>
            <p className="text-sm text-slate-400">Pendentes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-2xl font-semibold">{approvals.length - pendingCount}</p>
            <p className="text-sm text-slate-400">Concluídas</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <FileText className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-2xl font-semibold">ISO/GDPR</p>
            <p className="text-sm text-slate-400">Evidência de aprovação</p>
          </div>
        </div>
      </div>

      {toast ? <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{toast}</div> : null}

      <div className="grid gap-4">
        {approvals.map((approval) => (
          <article key={approval.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{approval.status}</span>
                  <span className="text-xs text-slate-500">{approval.submittedAt}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{approval.title}</h2>
                <p className="text-sm text-slate-400">Responsável: {approval.owner}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busyId === approval.id || approval.status === 'Aprovado'} onClick={() => updateStatus(approval.id, 'Aprovado')} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
                  <CheckCircle2 className="h-4 w-4" /> {busyId === approval.id ? 'A processar...' : 'Aprovar'}
                </button>
                <button type="button" disabled={busyId === approval.id || approval.status === 'Rejeitado'} onClick={() => updateStatus(approval.id, 'Rejeitado')} className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60">
                  <XCircle className="h-4 w-4" /> Rejeitar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
