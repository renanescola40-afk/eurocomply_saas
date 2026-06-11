import Link from 'next/link';
import { ClipboardCheck, CheckCircle2, CircleAlert, Download, FileText, ShieldCheck } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';
import { getSecurityQuestionnaireSummary, SECURITY_QUESTIONNAIRE_ITEMS } from '@/server/governance/security-questionnaire';

const COPY: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  score: string;
  ready: string;
  partial: string;
  input: string;
  categories: string;
  answers: string;
  evidence: string;
  nextActions: string;
  exportLabel: string;
  exportDescription: string;
}> = {
  en: {
    title: 'Security Questionnaire Center',
    subtitle: 'Reusable answers and evidence references for customer security reviews, RFPs and procurement questionnaires.',
    score: 'Questionnaire score',
    ready: 'Ready answers',
    partial: 'Partial answers',
    input: 'Need input',
    categories: 'Categories',
    answers: 'Questionnaire answers',
    evidence: 'Evidence references',
    nextActions: 'Next actions',
    exportLabel: 'Export questionnaire JSON',
    exportDescription: 'Download a signed JSON export for RFPs and security reviews.',
  },
  pt: {
    title: 'Centro de Questionários de Segurança',
    subtitle: 'Respostas reutilizáveis e referências de evidência para reviews de segurança, RFPs e procurement.',
    score: 'Score do questionário',
    ready: 'Respostas prontas',
    partial: 'Respostas parciais',
    input: 'Precisam de input',
    categories: 'Categorias',
    answers: 'Respostas do questionário',
    evidence: 'Referências de evidência',
    nextActions: 'Próximas ações',
    exportLabel: 'Exportar questionário JSON',
    exportDescription: 'Baixe um export JSON assinado para RFPs e reviews de segurança.',
  },
  es: {
    title: 'Centro de Cuestionarios de Seguridad',
    subtitle: 'Respuestas reutilizables y referencias de evidencia para revisiones de seguridad, RFPs y procurement.',
    score: 'Puntuación del cuestionario',
    ready: 'Respuestas listas',
    partial: 'Respuestas parciales',
    input: 'Necesitan input',
    categories: 'Categorías',
    answers: 'Respuestas del cuestionario',
    evidence: 'Referencias de evidencia',
    nextActions: 'Próximas acciones',
    exportLabel: 'Exportar cuestionario JSON',
    exportDescription: 'Descarga un export JSON firmado para RFPs y revisiones de seguridad.',
  },
  fr: {
    title: 'Centre de Questionnaires Sécurité',
    subtitle: 'Réponses réutilisables et références de preuves pour revues sécurité, RFP et procurement.',
    score: 'Score questionnaire',
    ready: 'Réponses prêtes',
    partial: 'Réponses partielles',
    input: 'À compléter',
    categories: 'Catégories',
    answers: 'Réponses questionnaire',
    evidence: 'Références preuves',
    nextActions: 'Prochaines actions',
    exportLabel: 'Exporter questionnaire JSON',
    exportDescription: 'Télécharger un export JSON signé pour RFP et revues sécurité.',
  },
  it: {
    title: 'Centro Questionari Sicurezza',
    subtitle: 'Risposte riutilizzabili e riferimenti evidenza per security review, RFP e procurement.',
    score: 'Punteggio questionario',
    ready: 'Risposte pronte',
    partial: 'Risposte parziali',
    input: 'Da completare',
    categories: 'Categorie',
    answers: 'Risposte questionario',
    evidence: 'Riferimenti evidenza',
    nextActions: 'Prossime azioni',
    exportLabel: 'Esporta questionario JSON',
    exportDescription: 'Scarica un export JSON firmato per RFP e security review.',
  },
  de: {
    title: 'Security Questionnaire Center',
    subtitle: 'Wiederverwendbare Antworten und Nachweise für Security Reviews, RFPs und Procurement-Fragen.',
    score: 'Questionnaire-Score',
    ready: 'Bereite Antworten',
    partial: 'Teilantworten',
    input: 'Input erforderlich',
    categories: 'Kategorien',
    answers: 'Questionnaire-Antworten',
    evidence: 'Nachweisreferenzen',
    nextActions: 'Nächste Schritte',
    exportLabel: 'Questionnaire JSON exportieren',
    exportDescription: 'Signierten JSON-Export für RFPs und Security Reviews herunterladen.',
  },
};

function statusText(status: string) {
  if (status === 'enterprise_ready') return 'Enterprise ready';
  if (status === 'review_ready') return 'Review ready';
  return 'Foundation';
}

function readinessClass(readiness: string) {
  if (readiness === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (readiness === 'partial') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-muted-foreground/20 bg-muted text-muted-foreground';
}

export default async function SecurityQuestionnairePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const copy = COPY[locale];
  const summary = getSecurityQuestionnaireSummary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] border bg-background/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">Enterprise Procurement</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-muted-foreground">{copy.subtitle}</p>
              <Link href="/api/security-questionnaire/export" className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5">
                <Download className="h-4 w-4" />
                {copy.exportLabel}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{copy.exportDescription}</p>
            </div>
            <div className="rounded-3xl border bg-muted/40 p-6 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8" />
              <p className="mt-3 text-sm text-muted-foreground">{copy.score}</p>
              <p className="mt-1 text-4xl font-semibold">{summary.score}%</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">{statusText(summary.status)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: copy.ready, value: summary.readyItems, icon: CheckCircle2 },
            { label: copy.partial, value: summary.partialItems, icon: CircleAlert },
            { label: copy.input, value: summary.needsInputItems, icon: FileText },
            { label: copy.categories, value: summary.categories.length, icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-3xl border bg-background/85 p-5 shadow-sm">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="mt-4 text-3xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{copy.answers}</h2>
            <div className="mt-5 space-y-4">
              {SECURITY_QUESTIONNAIRE_ITEMS.map((item) => (
                <article key={item.id} className="rounded-2xl border bg-muted/30 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.category.replaceAll('_', ' ')}</p>
                      <h3 className="mt-2 text-lg font-semibold">{item.question}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${readinessClass(item.readiness)}`}>{item.readiness.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.evidence}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.evidenceRefs.map((ref) => (
                        <span key={ref} className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">{ref}</span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{copy.nextActions}</h2>
            <ol className="mt-5 space-y-3">
              {summary.nextActions.map((action, index) => (
                <li key={action} className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <span className="mr-2 font-semibold text-foreground">{index + 1}.</span>{action}
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </section>
    </main>
  );
}
