'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShieldCheck, UsersRound } from 'lucide-react';

import { locales, type Locale } from '@/lib/i18n/routing';

type Role = 'R' | 'A' | 'C' | 'I';

export type RaciRow = {
  id: string;
  document: string;
  legal: Role;
  security: Role;
  compliance: Role;
  finance: Role;
};

const roles: Role[] = ['R', 'A', 'C', 'I'];

const copy: Record<Locale, {
  eyebrow: string; title: string; subtitle: string; openDocuments: string; teams: string; teamsBody: string; governance: string; governanceBody: string;
  document: string; saved: string; error: string; empty: string; emptyAction: string; saving: string;
  roleLabels: Record<Role, string>;
}> = {
  en: { eyebrow: 'Responsibilities', title: 'RACI matrix', subtitle: 'Assign responsible, accountable, consulted and informed roles to real controlled documents.', openDocuments: 'Open documents', teams: '4 responsibility groups', teamsBody: 'Legal, Security, Compliance and Finance', governance: 'Persisted governance', governanceBody: 'Assignments are stored per document and written to the audit trail.', document: 'Document', saved: 'RACI assignment saved.', error: 'The RACI assignment could not be saved. The previous value was restored.', empty: 'No controlled documents are available for RACI assignment.', emptyAction: 'Add controlled documents', saving: 'Saving…', roleLabels: { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' } },
  pt: { eyebrow: 'Responsabilidades', title: 'Matriz RACI', subtitle: 'Atribua responsável, aprovador, consultado e informado a documentos controlados reais.', openDocuments: 'Abrir documentos', teams: '4 grupos de responsabilidade', teamsBody: 'Legal, Security, Compliance e Finance', governance: 'Governação persistida', governanceBody: 'As atribuições são guardadas por documento e registadas no audit trail.', document: 'Documento', saved: 'Atribuição RACI guardada.', error: 'Não foi possível guardar a atribuição RACI. O valor anterior foi restaurado.', empty: 'Não existem documentos controlados disponíveis para atribuição RACI.', emptyAction: 'Adicionar documentos controlados', saving: 'A guardar…', roleLabels: { R: 'Responsável', A: 'Aprovador', C: 'Consultado', I: 'Informado' } },
  es: { eyebrow: 'Responsabilidades', title: 'Matriz RACI', subtitle: 'Asigna roles responsable, aprobador, consultado e informado a documentos controlados reales.', openDocuments: 'Abrir documentos', teams: '4 grupos de responsabilidad', teamsBody: 'Legal, Security, Compliance y Finance', governance: 'Gobernanza persistida', governanceBody: 'Las asignaciones se guardan por documento y se registran en la auditoría.', document: 'Documento', saved: 'Asignación RACI guardada.', error: 'No se pudo guardar la asignación RACI. Se restauró el valor anterior.', empty: 'No hay documentos controlados disponibles para asignación RACI.', emptyAction: 'Añadir documentos controlados', saving: 'Guardando…', roleLabels: { R: 'Responsable', A: 'Aprobador', C: 'Consultado', I: 'Informado' } },
  fr: { eyebrow: 'Responsabilités', title: 'Matrice RACI', subtitle: 'Attribuez les rôles responsable, approbateur, consulté et informé aux documents contrôlés réels.', openDocuments: 'Ouvrir les documents', teams: '4 groupes de responsabilité', teamsBody: 'Legal, Security, Compliance et Finance', governance: 'Gouvernance persistée', governanceBody: 'Les attributions sont enregistrées par document et inscrites dans la piste d’audit.', document: 'Document', saved: 'Attribution RACI enregistrée.', error: 'L’attribution RACI n’a pas pu être enregistrée. La valeur précédente a été restaurée.', empty: 'Aucun document contrôlé n’est disponible pour une attribution RACI.', emptyAction: 'Ajouter des documents contrôlés', saving: 'Enregistrement…', roleLabels: { R: 'Responsable', A: 'Approbateur', C: 'Consulté', I: 'Informé' } },
  it: { eyebrow: 'Responsabilità', title: 'Matrice RACI', subtitle: 'Assegna i ruoli responsabile, approvatore, consultato e informato a documenti controllati reali.', openDocuments: 'Apri documenti', teams: '4 gruppi di responsabilità', teamsBody: 'Legal, Security, Compliance e Finance', governance: 'Governance persistita', governanceBody: 'Le assegnazioni vengono salvate per documento e registrate nell’audit trail.', document: 'Documento', saved: 'Assegnazione RACI salvata.', error: 'Impossibile salvare l’assegnazione RACI. È stato ripristinato il valore precedente.', empty: 'Nessun documento controllato disponibile per l’assegnazione RACI.', emptyAction: 'Aggiungi documenti controllati', saving: 'Salvataggio…', roleLabels: { R: 'Responsabile', A: 'Approvatore', C: 'Consultato', I: 'Informato' } },
  de: { eyebrow: 'Verantwortlichkeiten', title: 'RACI-Matrix', subtitle: 'Weisen Sie realen kontrollierten Dokumenten Verantwortliche, Freigebende, Konsultierte und Informierte zu.', openDocuments: 'Dokumente öffnen', teams: '4 Verantwortungsgruppen', teamsBody: 'Legal, Security, Compliance und Finance', governance: 'Persistierte Governance', governanceBody: 'Zuweisungen werden pro Dokument gespeichert und im Audit-Trail protokolliert.', document: 'Dokument', saved: 'RACI-Zuweisung gespeichert.', error: 'Die RACI-Zuweisung konnte nicht gespeichert werden. Der vorherige Wert wurde wiederhergestellt.', empty: 'Keine kontrollierten Dokumente für RACI-Zuweisungen verfügbar.', emptyAction: 'Kontrollierte Dokumente hinzufügen', saving: 'Wird gespeichert…', roleLabels: { R: 'Verantwortlich', A: 'Freigebend', C: 'Konsultiert', I: 'Informiert' } },
};

function activeLocale(locale: string): Locale {
  return locales.includes(locale as Locale) ? (locale as Locale) : 'en';
}

export default function RaciClient({ locale, initialRows }: { locale: string; initialRows: RaciRow[] }) {
  const t = copy[activeLocale(locale)];
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);

  async function updateRole(id: string, team: keyof Omit<RaciRow, 'id' | 'document'>, nextRole: Role) {
    const previous = rows.find((row) => row.id === id);
    if (!previous || previous[team] === nextRole || savingDocumentId === id) return;

    const nextRow = { ...previous, [team]: nextRole };
    setRows((items) => items.map((item) => (item.id === id ? nextRow : item)));
    setSavingDocumentId(id);
    setStatus(null);

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}/raci`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal: nextRow.legal,
          security: nextRow.security,
          compliance: nextRow.compliance,
          finance: nextRow.finance,
        }),
      });

      if (!response.ok) throw new Error('raci_update_failed');
      setStatus({ tone: 'success', message: t.saved });
    } catch {
      setRows((items) => items.map((item) => (item.id === id ? previous : item)));
      setStatus({ tone: 'error', message: t.error });
    } finally {
      setSavingDocumentId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-[#0b121e] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{t.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t.subtitle}</p>
          </div>
          <Link href={`/${locale}/dashboard/organizations/documents`} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            {t.openDocuments}
          </Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
            <UsersRound className="h-5 w-5 text-blue-300" aria-hidden="true" />
            <p className="mt-3 text-xl font-semibold">{t.teams}</p>
            <p className="mt-1 text-sm text-slate-400">{t.teamsBody}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0d1624] p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            <p className="mt-3 text-xl font-semibold">{t.governance}</p>
            <p className="mt-1 text-sm text-slate-400">{t.governanceBody}</p>
          </div>
        </div>
      </header>

      {status ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${status.tone === 'success' ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100' : 'border-rose-400/20 bg-rose-400/[0.07] text-rose-100'}`} role={status.tone === 'error' ? 'alert' : 'status'} aria-live="polite">
          {status.message}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-[#0b121e] p-8 text-center">
          <p className="text-sm text-slate-400">{t.empty}</p>
          <Link href={`/${locale}/dashboard/organizations/documents`} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            {t.emptyAction}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-[#0d1624] text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t.document}</th>
                  <th className="px-4 py-3">Legal</th>
                  <th className="px-4 py-3">Security</th>
                  <th className="px-4 py-3">Compliance</th>
                  <th className="px-4 py-3">Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="max-w-xs break-words px-4 py-4 font-medium text-slate-100">{row.document}</td>
                    {(['legal', 'security', 'compliance', 'finance'] as const).map((team) => (
                      <td key={team} className="px-4 py-4">
                        <select
                          value={row[team]}
                          disabled={savingDocumentId === row.id}
                          onChange={(event) => void updateRole(row.id, team, event.target.value as Role)}
                          className="h-10 rounded-lg border border-slate-700 bg-[#0d1624] px-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60"
                          aria-label={`${team} role for ${row.document}`}
                        >
                          {roles.map((role) => <option key={role} value={role}>{role} · {t.roleLabels[role]}</option>)}
                        </select>
                        {savingDocumentId === row.id ? <span className="ml-2 text-xs text-slate-500" role="status">{t.saving}</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
