'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';

type Obligation = {
  id: string;
  title: string;
  framework: string;
  due: string;
  owner: string;
  status: 'Pendente' | 'Concluído' | 'Adiado';
};

const initialObligations: Obligation[] = [
  { id: 'cal-1', title: 'Revisão anual da política de privacidade', framework: 'GDPR', due: '2026-06-18', owner: 'Compliance Lead', status: 'Pendente' },
  { id: 'cal-2', title: 'Atualizar registo de fornecedores críticos', framework: 'DORA/NIS2', due: '2026-06-24', owner: 'Legal Counsel', status: 'Pendente' },
  { id: 'cal-3', title: 'Validar evidências de controlo de acesso', framework: 'ISO 27001', due: '2026-07-02', owner: 'Security Owner', status: 'Pendente' },
];

export default function ComplianceCalendarClient({ locale }: { locale: string }) {
  const [obligations, setObligations] = useState(initialObligations);
  const [toast, setToast] = useState('');

  const pendingCount = useMemo(() => obligations.filter((item) => item.status === 'Pendente').length, [obligations]);

  const setStatus = (id: string, status: Obligation['status']) => {
    setObligations((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    setToast(status === 'Concluído' ? 'Obrigação concluída e pronta para evidência.' : 'Prazo marcado como adiado para revisão interna.');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Calendário legal</p>
            <h1 className="mt-2 text-3xl font-semibold">Calendário de Obrigações de Compliance</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Acompanhe prazos, revisões e obrigações regulatórias antes de virarem risco operacional.
            </p>
          </div>
          <Link href={`/${locale}/auditoria`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-300/50 hover:bg-amber-300/10">
            Ver trilha de auditoria
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <CalendarDays className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-2xl font-semibold">{obligations.length}</p>
            <p className="text-sm text-slate-400">Obrigações mapeadas</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <AlertTriangle className="h-5 w-5 text-rose-300" />
            <p className="mt-3 text-2xl font-semibold">{pendingCount}</p>
            <p className="text-sm text-slate-400">Alertas pendentes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <Clock3 className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-2xl font-semibold">30 dias</p>
            <p className="text-sm text-slate-400">Janela de atenção</p>
          </div>
        </div>
      </div>

      {toast ? <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{toast}</div> : null}

      <div className="grid gap-4">
        {obligations.map((obligation) => (
          <article key={obligation.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{obligation.framework}</span>
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-100">Vence em {obligation.due}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{obligation.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{obligation.title}</h2>
                <p className="text-sm text-slate-400">Responsável: {obligation.owner}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStatus(obligation.id, 'Concluído')} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Concluir
                </button>
                <button type="button" onClick={() => setStatus(obligation.id, 'Adiado')} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                  Adiar revisão
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
