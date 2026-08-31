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

type ToastState = {
  message: string;
  tone: 'info' | 'error';
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

function statusTone(status: Approval['status']) {
  if (status === 'Aprovado') return 'border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/80';
  if (status === 'Rejeitado') return 'border-rose-300/15 bg-rose-300/[0.055] text-rose-100/80';
  return 'border-amber-300/15 bg-amber-300/[0.055] text-amber-100/80';
}

export default function ApprovalsClient({ locale, initialDocuments = [] }: { locale: string; initialDocuments?: DocumentRecord[] }) {
  const [approvals, setApprovals] = useState<Approval[]>(() => {
    const mapped = mapDocumentsToApprovals(initialDocuments);
    return mapped.length > 0 ? mapped : fallbackApprovals;
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(() => approvals.filter((item) => item.status === 'Pendente').length, [approvals]);
  const completedCount = approvals.length - pendingCount;
  const isUsingRealDocuments = initialDocuments.length > 0;

  const updateStatus = async (id: string, status: Approval['status']) => {
    setBusyId(id);
    setToast(null);

    const action = status === 'Aprovado' ? 'approve' : 'reject';

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: status === 'Aprovado' ? 'Approved from workflow page' : 'Rejected from workflow page' }),
      });

      const payload = await response.json().catch(() => null) as { persisted?: boolean; error?: string } | null;

      if (!response.ok) {
        setToast({ message: payload?.error ?? 'Não foi possível atualizar a aprovação.', tone: 'error' });
        return;
      }

      setApprovals((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
      setToast({
        tone: 'info',
        message:
          status === 'Aprovado'
            ? payload?.persisted
              ? 'Documento aprovado e persistido no workflow.'
              : 'Documento aprovado na interface e registado como evento de auditoria.'
            : payload?.persisted
              ? 'Documento rejeitado e persistido no workflow.'
              : 'Documento rejeitado na interface e registado como evento de auditoria.',
      });
    } catch {
      setToast({ message: 'Falha de rede ao atualizar aprovação. Tente novamente.', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5 text-white">
      <div className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522]">
        <div className="flex flex-col gap-4 border-b border-white/[0.055] px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/65">Approval workflow</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Gestão de Aprovações</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
              Aprove ou rejeite documentos controlados antes de entrarem no pacote de auditoria.
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/organizations/documents`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-white/70 transition hover:border-blue-300/25 hover:bg-blue-400/[0.08] hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
          >
            Ver documentos
          </Link>
        </div>

        <div className="grid sm:grid-cols-3">
          <div className="px-5 py-4 md:px-6">
            <Clock3 className="h-4 w-4 text-amber-200/80" />
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{pendingCount}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Pendentes</p>
          </div>
          <div className="border-t border-white/[0.055] px-5 py-4 sm:border-l sm:border-t-0 md:px-6">
            <ShieldCheck className="h-4 w-4 text-emerald-200/80" />
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{completedCount}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Concluídas</p>
          </div>
          <div className="border-t border-white/[0.055] px-5 py-4 sm:border-l sm:border-t-0 md:px-6">
            <FileText className="h-4 w-4 text-blue-200/80" />
            <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">ISO / GDPR</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28">Evidência de aprovação</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-300/15 bg-blue-400/[0.055] px-4 py-3 text-sm text-blue-100/70">
        {isUsingRealDocuments ? 'A mostrar documentos reais da organização.' : 'Sem documentos reais disponíveis: a mostrar workflow demo seguro.'}
      </div>

      {toast ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${toast.tone === 'error' ? 'border-rose-300/20 bg-rose-300/[0.07] text-rose-100/80' : 'border-blue-300/20 bg-blue-300/[0.07] text-blue-100/80'}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#0d1522]">
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 border-b border-white/[0.055] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/28 md:grid-cols-[minmax(0,1fr)_160px_120px_230px] md:px-6">
          <span>Documento</span>
          <span className="hidden md:block">Responsável</span>
          <span>Estado</span>
          <span className="hidden text-right md:block">Ações</span>
        </div>

        <div className="divide-y divide-white/[0.055]">
          {approvals.map((approval) => (
            <article key={approval.id} className="px-5 py-4 transition hover:bg-white/[0.025] md:px-6">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_120px_230px] md:items-center">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-white/84">{approval.title}</h2>
                  <p className="mt-1 text-xs text-white/32 md:hidden">{approval.owner}</p>
                  <p className="mt-1 text-xs text-white/28">{approval.submittedAt}</p>
                </div>
                <p className="hidden text-sm text-white/42 md:block">{approval.owner}</p>
                <span className={`w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusTone(approval.status)}`}>
                  {approval.status}
                </span>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    type="button"
                    disabled={busyId === approval.id || approval.status === 'Aprovado'}
                    onClick={() => updateStatus(approval.id, 'Aprovado')}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 text-xs font-semibold text-emerald-100/85 transition hover:bg-emerald-300/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {busyId === approval.id ? 'A processar...' : 'Aprovar'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === approval.id || approval.status === 'Rejeitado'}
                    onClick={() => updateStatus(approval.id, 'Rejeitado')}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.055] px-3 text-xs font-semibold text-rose-100/80 transition hover:bg-rose-300/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Rejeitar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
