import Link from 'next/link';
import { Archive, CalendarClock, CheckCircle2, Clock3, Download, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { getRetentionSummary, RETENTION_POLICIES } from '@/server/governance/retention-policy';

const copy: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  score: string;
  policies: string;
  shortest: string;
  longest: string;
  nextActions: string;
  months: string;
  enterpriseReady: string;
  exportLabel: string;
  exportDescription: string;
}> = {
  en: {
    title: 'Retention Center',
    subtitle: 'Operational view of how RISCK COMPLY preserves compliance evidence, governance records and audit history.',
    score: 'Retention readiness',
    policies: 'Covered categories',
    shortest: 'Shortest retention',
    longest: 'Longest retention',
    nextActions: 'Next actions',
    months: 'months',
    enterpriseReady: 'Ready for evidence review',
    exportLabel: 'Export retention JSON',
    exportDescription: 'Download a structured retention-policy JSON export for DPA, GDPR and procurement reviews.',
  },
  pt: {
    title: 'Centro de Retenção',
    subtitle: 'Visão operacional de como a RISCK COMPLY conserva evidências de conformidade, registos de governação e histórico de auditoria.',
    score: 'Preparação da retenção',
    policies: 'Categorias abrangidas',
    shortest: 'Retenção mais curta',
    longest: 'Retenção mais longa',
    nextActions: 'Próximas ações',
    months: 'meses',
    enterpriseReady: 'Preparado para revisão de evidências',
    exportLabel: 'Exportar retenção em JSON',
    exportDescription: 'Transfira um ficheiro JSON estruturado da política de retenção para revisões de DPA, RGPD e processos de aquisição.',
  },
  es: {
    title: 'Centro de Retención',
    subtitle: 'Vista operativa de cómo RISCK COMPLY conserva evidencias de cumplimiento, registros de gobernanza e historial de auditoría.',
    score: 'Preparación de la retención',
    policies: 'Categorías cubiertas',
    shortest: 'Retención más corta',
    longest: 'Retención más larga',
    nextActions: 'Próximas acciones',
    months: 'meses',
    enterpriseReady: 'Preparado para revisar evidencias',
    exportLabel: 'Exportar retención en JSON',
    exportDescription: 'Descarga una exportación JSON estructurada de la política de retención para revisiones de DPA, RGPD y compras.',
  },
  fr: {
    title: 'Centre de conservation',
    subtitle: 'Vue opérationnelle de la manière dont RISCK COMPLY conserve les preuves de conformité, les registres de gouvernance et l’historique d’audit.',
    score: 'Préparation de la conservation',
    policies: 'Catégories couvertes',
    shortest: 'Durée de conservation minimale',
    longest: 'Durée de conservation maximale',
    nextActions: 'Prochaines actions',
    months: 'mois',
    enterpriseReady: 'Prêt pour la revue des preuves',
    exportLabel: 'Exporter la conservation en JSON',
    exportDescription: 'Téléchargez un export JSON structuré de la politique de conservation pour les revues DPA, RGPD et achats.',
  },
  it: {
    title: 'Centro di conservazione',
    subtitle: 'Vista operativa di come RISCK COMPLY conserva le evidenze di conformità, i registri di governance e la cronologia di audit.',
    score: 'Preparazione della conservazione',
    policies: 'Categorie coperte',
    shortest: 'Periodo minimo di conservazione',
    longest: 'Periodo massimo di conservazione',
    nextActions: 'Prossime azioni',
    months: 'mesi',
    enterpriseReady: 'Pronto per la revisione delle evidenze',
    exportLabel: 'Esporta la conservazione in JSON',
    exportDescription: 'Scarica un export JSON strutturato della politica di conservazione per le revisioni DPA, GDPR e acquisti.',
  },
  de: {
    title: 'Aufbewahrungsübersicht',
    subtitle: 'Operative Übersicht darüber, wie RISCK COMPLY Compliance-Nachweise, Governance-Datensätze und den Prüfverlauf aufbewahrt.',
    score: 'Aufbewahrungsreife',
    policies: 'Abgedeckte Kategorien',
    shortest: 'Kürzeste Aufbewahrung',
    longest: 'Längste Aufbewahrung',
    nextActions: 'Nächste Schritte',
    months: 'Monate',
    enterpriseReady: 'Für die Evidenzprüfung vorbereitet',
    exportLabel: 'Aufbewahrungsdaten als JSON exportieren',
    exportDescription: 'Laden Sie einen strukturierten JSON-Export der Aufbewahrungsrichtlinie für DPA-, DSGVO- und Beschaffungsprüfungen herunter.',
  },
};

export default async function RetentionCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const t = copy[locale];
  const summary = getRetentionSummary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage={t.title} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-[2rem] border bg-card/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                <Archive className="h-4 w-4" /> Evidence operations
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground">{t.title}</h1>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t.subtitle}</p>
              <Link href="/api/retention-center/export" className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5">
                <Download className="h-4 w-4" />
                {t.exportLabel}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{t.exportDescription}</p>
            </div>
            <div className="rounded-3xl border bg-background p-6 text-center">
              <p className="text-sm text-muted-foreground">{t.score}</p>
              <p className="mt-2 text-5xl font-semibold text-foreground">{summary.readinessScore}%</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border bg-card p-6">
            <CheckCircle2 className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.policies}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.enterpriseReadyPolicies}/{summary.totalPolicies}</p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <Clock3 className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.shortest}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.minimumMonths} {t.months}</p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <CalendarClock className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.longest}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.maximumMonths} {t.months}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {RETENTION_POLICIES.map((policy) => (
            <article key={policy.category} className="rounded-3xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{policy.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{policy.rationale}</p>
                </div>
                <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {policy.retentionMonths} {t.months}
                </span>
              </div>
              {policy.enterpriseReady ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> {t.enterpriseReady}
                </p>
              ) : null}
            </article>
          ))}
        </section>

        <section className="rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">{t.nextActions}</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {summary.nextActions.map((action) => (
              <li key={action} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-foreground" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
