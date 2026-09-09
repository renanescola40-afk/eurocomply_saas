import Link from 'next/link';
import { Archive, CalendarClock, CheckCircle2, Clock3, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { getRetentionSummary, RETENTION_POLICIES } from '@/server/governance/retention-policy';

const copy: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  notice: string;
  score: string;
  policies: string;
  shortest: string;
  longest: string;
  nextActions: string;
  months: string;
  proposed: string;
  approved: string;
  draft: string;
  exportLabel: string;
  exportDescription: string;
}> = {
  en: {
    title: 'Retention Center',
    subtitle: 'Operational review of proposed retention targets for compliance evidence, governance records and audit history.',
    notice: 'Draft policy only. These targets are not final contractual commitments and are not marked enterprise-ready until qualified approval and attributable enforcement evidence exist.',
    score: 'Approved retention coverage',
    policies: 'Approved + enforcement-proven categories',
    shortest: 'Shortest draft target',
    longest: 'Longest draft target',
    nextActions: 'Required closure actions',
    months: 'months',
    proposed: 'proposed',
    approved: 'Approved and enforcement-proven',
    draft: 'Draft — approval and enforcement proof required',
    exportLabel: 'Export retention review JSON',
    exportDescription: 'Download a structured draft-policy export for DPA, GDPR and procurement review. The export is evidence for review, not proof of legal approval or automatic enforcement.',
  },
  pt: {
    title: 'Centro de Retenção',
    subtitle: 'Revisão operacional de metas propostas de retenção para evidências de conformidade, registos de governação e histórico de auditoria.',
    notice: 'Apenas política em rascunho. Estas metas não são compromissos contratuais finais e não são marcadas como enterprise-ready até existir aprovação qualificada e evidência atribuível de enforcement.',
    score: 'Cobertura de retenção aprovada',
    policies: 'Categorias aprovadas + enforcement comprovado',
    shortest: 'Meta de rascunho mais curta',
    longest: 'Meta de rascunho mais longa',
    nextActions: 'Ações obrigatórias para fecho',
    months: 'meses',
    proposed: 'propostos',
    approved: 'Aprovado e com enforcement comprovado',
    draft: 'Rascunho — exige aprovação e prova de enforcement',
    exportLabel: 'Exportar revisão de retenção em JSON',
    exportDescription: 'Transfira um export estruturado da política em rascunho para revisões de DPA, RGPD e procurement. O export serve para revisão; não prova aprovação jurídica nem enforcement automático.',
  },
  es: {
    title: 'Centro de Retención',
    subtitle: 'Revisión operativa de objetivos propuestos de conservación para evidencias, gobernanza e historial de auditoría.',
    notice: 'Política en borrador. Estos objetivos no son compromisos contractuales finales ni se consideran enterprise-ready hasta contar con aprobación cualificada y evidencia atribuible de aplicación.',
    score: 'Cobertura de retención aprobada',
    policies: 'Categorías aprobadas + aplicación demostrada',
    shortest: 'Objetivo de borrador más corto',
    longest: 'Objetivo de borrador más largo',
    nextActions: 'Acciones obligatorias para cierre',
    months: 'meses',
    proposed: 'propuestos',
    approved: 'Aprobado y con aplicación demostrada',
    draft: 'Borrador — requiere aprobación y prueba de aplicación',
    exportLabel: 'Exportar revisión de retención en JSON',
    exportDescription: 'Descarga una exportación estructurada de la política en borrador para revisiones DPA, RGPD y compras. No demuestra aprobación legal ni aplicación automática.',
  },
  fr: {
    title: 'Centre de conservation',
    subtitle: 'Revue opérationnelle des objectifs de conservation proposés pour les preuves, la gouvernance et l’historique d’audit.',
    notice: 'Politique à l’état de projet. Ces objectifs ne constituent pas des engagements contractuels finaux et ne sont pas enterprise-ready sans approbation qualifiée et preuve attribuable de mise en œuvre.',
    score: 'Couverture de conservation approuvée',
    policies: 'Catégories approuvées + mise en œuvre prouvée',
    shortest: 'Objectif de projet le plus court',
    longest: 'Objectif de projet le plus long',
    nextActions: 'Actions requises pour la clôture',
    months: 'mois',
    proposed: 'proposés',
    approved: 'Approuvé et mise en œuvre prouvée',
    draft: 'Projet — approbation et preuve de mise en œuvre requises',
    exportLabel: 'Exporter la revue de conservation en JSON',
    exportDescription: 'Téléchargez un export structuré de la politique projet pour les revues DPA, RGPD et achats. Il ne prouve ni approbation juridique ni application automatique.',
  },
  it: {
    title: 'Centro di conservazione',
    subtitle: 'Revisione operativa degli obiettivi proposti di conservazione per evidenze, governance e cronologia di audit.',
    notice: 'Politica in bozza. Questi obiettivi non sono impegni contrattuali finali e non sono enterprise-ready finché non esistono approvazione qualificata e prova attribuibile dell’applicazione.',
    score: 'Copertura di conservazione approvata',
    policies: 'Categorie approvate + applicazione provata',
    shortest: 'Obiettivo di bozza più breve',
    longest: 'Obiettivo di bozza più lungo',
    nextActions: 'Azioni richieste per la chiusura',
    months: 'mesi',
    proposed: 'proposti',
    approved: 'Approvato e applicazione provata',
    draft: 'Bozza — richiede approvazione e prova di applicazione',
    exportLabel: 'Esporta revisione conservazione JSON',
    exportDescription: 'Scarica un export strutturato della politica in bozza per revisioni DPA, GDPR e procurement. Non prova approvazione legale né applicazione automatica.',
  },
  de: {
    title: 'Aufbewahrungsübersicht',
    subtitle: 'Operative Prüfung vorgeschlagener Aufbewahrungsziele für Nachweise, Governance-Datensätze und Prüfverläufe.',
    notice: 'Nur Richtlinienentwurf. Diese Ziele sind keine endgültigen vertraglichen Zusagen und gelten erst nach qualifizierter Freigabe und nachweisbarer Durchsetzung als enterprise-ready.',
    score: 'Genehmigte Aufbewahrungsabdeckung',
    policies: 'Genehmigte + nachweislich durchgesetzte Kategorien',
    shortest: 'Kürzestes Entwurfsziel',
    longest: 'Längstes Entwurfsziel',
    nextActions: 'Erforderliche Abschlussmaßnahmen',
    months: 'Monate',
    proposed: 'vorgeschlagen',
    approved: 'Genehmigt und Durchsetzung nachgewiesen',
    draft: 'Entwurf — Genehmigung und Durchsetzungsnachweis erforderlich',
    exportLabel: 'Aufbewahrungsprüfung als JSON exportieren',
    exportDescription: 'Laden Sie einen strukturierten Entwurfsexport für DPA-, DSGVO- und Beschaffungsprüfungen herunter. Er belegt weder rechtliche Freigabe noch automatische Durchsetzung.',
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
              <p className="mt-4 rounded-2xl border bg-background p-4 text-sm leading-6 text-muted-foreground">
                {t.notice}
              </p>
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
            <p className="mt-2 text-3xl font-semibold">{summary.minimumMonths} {t.months} <span className="text-sm font-normal text-muted-foreground">{t.proposed}</span></p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <CalendarClock className="h-5 w-5 text-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">{t.longest}</p>
            <p className="mt-2 text-3xl font-semibold">{summary.maximumMonths} {t.months} <span className="text-sm font-normal text-muted-foreground">{t.proposed}</span></p>
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
                  {policy.retentionMonths} {t.months} — {t.proposed}
                </span>
              </div>
              {policy.enterpriseReady ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4" /> {t.approved}
                </p>
              ) : (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> {t.draft}
                </p>
              )}
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
