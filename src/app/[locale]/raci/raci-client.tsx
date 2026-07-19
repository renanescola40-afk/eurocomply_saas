'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShieldCheck, UsersRound } from 'lucide-react';

type Role = 'R' | 'A' | 'C' | 'I';

type Row = {
  id: string;
  document: string;
  legal: Role;
  security: Role;
  compliance: Role;
  finance: Role;
};

const initialRows: Row[] = [
  { id: 'raci-1', document: 'Política de Privacidade', legal: 'A', security: 'C', compliance: 'R', finance: 'I' },
  { id: 'raci-2', document: 'Matriz de Riscos', legal: 'C', security: 'R', compliance: 'A', finance: 'I' },
  { id: 'raci-3', document: 'Revisão de Fornecedores', legal: 'R', security: 'C', compliance: 'A', finance: 'I' },
];

const roles: Role[] = ['R', 'A', 'C', 'I'];
const roleLabels: Record<Role, string> = {
  R: 'Responsável',
  A: 'Aprovador',
  C: 'Consultado',
  I: 'Informado',
};

export default function RaciClient({ locale }: { locale: string }) {
  const [rows, setRows] = useState(initialRows);
  const [toast, setToast] = useState('');

  const updateRole = (id: string, team: keyof Omit<Row, 'id' | 'document'>, role: Role) => {
    setRows((items) => items.map((item) => (item.id === id ? { ...item, [team]: role } : item)));
    setToast('Matriz RACI atualizada para auditoria interna.');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Responsabilidades</p>
            <h1 className="mt-2 text-3xl font-semibold">Matriz RACI</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Defina quem é responsável, aprovador, consultado e informado por documento controlado.
            </p>
          </div>
          <Link href={`/${locale}/dashboard/organizations/documents`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300/50 hover:bg-sky-300/10">
            Abrir documentos
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <UsersRound className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-2xl font-semibold">4 equipas</p>
            <p className="text-sm text-slate-400">Legal, Security, Compliance e Finance</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-2xl font-semibold">ISO/GDPR</p>
            <p className="text-sm text-slate-400">Separação de deveres visível</p>
          </div>
        </div>
      </div>

      {toast ? <div className="rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">{toast}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-4">Documento</th>
                <th className="px-4 py-4">Legal</th>
                <th className="px-4 py-4">Security</th>
                <th className="px-4 py-4">Compliance</th>
                <th className="px-4 py-4">Finance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 font-medium text-white">{row.document}</td>
                  {(['legal', 'security', 'compliance', 'finance'] as const).map((team) => (
                    <td key={team} className="px-4 py-4">
                      <select
                        value={row[team]}
                        onChange={(event) => updateRole(row.id, team, event.target.value as Role)}
                        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-300/50"
                        aria-label={`${team} role for ${row.document}`}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>{role} · {roleLabels[role]}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
