import { QUALIFIED_REVIEW_WORKSTREAMS } from '@/server/ai-governance/qualified-review-operations';

const LABELS: Record<keyof typeof QUALIFIED_REVIEW_WORKSTREAMS, string> = {
  'LEGAL-RULES': 'Legal rules registry',
  'PROHIBITED-PRACTICES': 'Article 5 prohibited practices',
  'ARTICLE-50': 'Article 50 transparency wording',
  FRIA: 'Article 27 FRIA methodology',
  DEPLOYER: 'Deployer obligations',
  'HIGH-RISK-PROVIDER': 'High-risk provider methodology',
  CONFORMITY: 'Conformity readiness',
  GPAI: 'GPAI applicability and obligations',
};

export default function QualifiedReviewsPage() {
  const entries = Object.entries(QUALIFIED_REVIEW_WORKSTREAMS) as Array<[keyof typeof QUALIFIED_REVIEW_WORKSTREAMS, number]>;
  return (
    <main className="space-y-8 p-6 lg:p-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Independent assurance</p>
        <h1 className="text-3xl font-semibold tracking-tight">Qualified Review Workspace</h1>
        <p className="text-muted-foreground">Coordinate exact-SHA legal and methodology reviews. Records support readiness evidence and do not constitute certification, regulator approval or legal advice.</p>
      </header>
      <section aria-label="Review requirements" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map(([workstream, weight]) => (
          <article key={workstream} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{workstream}</p><h2 className="mt-2 text-lg font-semibold">{LABELS[workstream]}</h2></div>
              <span className="rounded-full border px-2.5 py-1 text-xs font-medium">HUMAN_REVIEW_REQUIRED</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Weight</dt><dd className="font-medium">{weight} points</dd></div>
              <div><dt className="text-muted-foreground">Exact SHA</dt><dd className="font-medium">Required</dd></div>
              <div><dt className="text-muted-foreground">Conflict check</dt><dd className="font-medium">Required</dd></div>
              <div><dt className="text-muted-foreground">Evidence digest</dt><dd className="font-medium">Required</dd></div>
            </dl>
          </article>
        ))}
      </section>
      <aside className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">Do not upload identity documents, privileged legal advice, customer data or secrets. Store redacted references and digest-backed evidence only.</aside>
    </main>
  );
}
