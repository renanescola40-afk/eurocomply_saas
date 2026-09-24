import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { getCurrentUser } from '@/server/queries/auth';
import { listAuditEventsForUser } from '@/server/queries/compliance-activity';

type AuditCopy = {
  eyebrow: string;
  title: string;
  description: string;
  notifications: string;
  actor: string;
  action: string;
  date: string;
  type: string;
  empty: string;
};

const copy: Record<string, AuditCopy> = {
  en: {
    eyebrow: 'Audit log',
    title: 'Compliance activity trail',
    description: 'Review recorded governance and compliance activity in one chronological trail.',
    notifications: 'View notifications',
    actor: 'Actor',
    action: 'Action',
    date: 'Date',
    type: 'Type',
    empty: 'No audit events are available yet.',
  },
  pt: {
    eyebrow: 'Registo de auditoria',
    title: 'Trilha de atividade de compliance',
    description: 'Consulte a atividade de governação e compliance registada numa única linha cronológica.',
    notifications: 'Ver notificações',
    actor: 'Ator',
    action: 'Ação',
    date: 'Data',
    type: 'Tipo',
    empty: 'Ainda não existem eventos de auditoria disponíveis.',
  },
};

export default async function AuditLogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const rows = await listAuditEventsForUser(user.id);
  const t = copy[locale] ?? copy.en;

  const content = (
    <div className="mx-auto max-w-7xl space-y-6 bg-transparent">
      <section className="rounded-2xl border border-slate-800 bg-[#0b121e] p-6 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-100">{t.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{t.description}</p>
        <Link
          href={`/${locale}/notificacoes`}
          className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-200 transition hover:border-blue-500/50 hover:text-white"
        >
          {t.notifications}
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b121e] shadow-sm">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500" role="status">{t.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#080e18] text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                <tr>
                  <th className="p-4">{t.actor}</th>
                  <th className="p-4">{t.action}</th>
                  <th className="p-4">{t.date}</th>
                  <th className="p-4">{t.type}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#0e1827]">
                    <td className="p-4 text-slate-300">{row.actor}</td>
                    <td className="p-4 text-slate-200">{row.action}</td>
                    <td className="p-4 text-slate-400">{row.createdAt}</td>
                    <td className="p-4 text-slate-400">{row.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
