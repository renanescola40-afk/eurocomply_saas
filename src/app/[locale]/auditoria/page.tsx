import Link from 'next/link';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';

export default async function AuditLogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const rows = [
    ['Admin', 'Atualizou documento controlado', '2025-04-02 09:20', 'Documento'],
    ['Compliance', 'Aprovou matriz de riscos', '2025-04-08 14:10', 'Aprovação'],
    ['Sistema', 'Gerou relatório mensal', '2025-05-01 08:00', 'Sistema'],
    ['Legal', 'Revendo contrato de fornecedor', '2025-05-03 12:31', 'Fornecedor'],
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardCommandNavigation locale={locale} activePage="Command Center" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary">Log de Auditoria</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Trilha de conformidade</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Registo demonstrativo de ações relevantes para auditoria, GDPR e ISO 27001.</p>
          <Link href={`/${locale}/notificacoes`} className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">Ver notificações</Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {['Usuário', 'Ação', 'Data'].map((label) => (
            <div key={label} className="rounded-2xl border bg-background p-4 shadow-sm">
              <label className="text-sm font-semibold">Filtro por {label}</label>
              <select className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm">
                <option>Todos</option>
                <option>Admin</option>
                <option>Compliance</option>
                <option>Sistema</option>
              </select>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Data</th><th className="p-4">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.join('-')} className="border-t">
                  {row.map((cell) => <td key={cell} className="p-4">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
