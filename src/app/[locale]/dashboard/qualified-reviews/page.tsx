import { QUALIFIED_REVIEW_REQUIREMENTS } from '@/server/ai-governance/qualified-review-workspace';

const LABELS: Record<string, string> = {
  'legal-rules': 'Legal rules registry',
  'prohibited-practices': 'Article 5 prohibited practices',
  'article-50-copy': 'Article 50 transparency wording',
  'fria-methodology': 'Article 27 FRIA methodology',
  'deployer-obligations': 'Deployer obligations',
  'high-risk-provider': 'High-risk provider methodology',
  conformity: 'Conformity, declaration, CE and registration',
  gpai: 'GPAI applicability and obligations',
};

export default function QualifiedReviewsPage() {
  return (
    <main className="space-y-8 p-6 lg:p-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Independent assurance</p>
        <h1 className="text-3xl font-semibold tracking-tight">Qualified Review Workspace</h1>
        <p className="text-muted-foreground">
          Coordinate the eight legal and methodology reviews required for final EU AI Act product-coverage closeout. Approval records remain evidence of review, not certification or regulator acceptance.
        </p>
      </header>

      <section aria-label="Review requirements" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {QUALIFIED_REVIEW_REQUIREMENTS.map((requirement) => (
          <article key={requirement} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{requirement}</p>
                <h2 className="mt-2 text-lg font-semibold">{LABELS[requirement]}</h2>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs font-medium">Awaiting reviewer</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Exact SHA</dt><dd className="font-medium">Required</dd></div>
              <div><dt className="text-muted-foreground">Conflict check</dt><dd className="font-medium">Required</dd></div>
              <div><dt className="text-muted-foreground">Evidence digest</dt><dd className="font-medium">Required</dd></div>
              <div><dt className="text-muted-foreground">Independent approval</dt><dd className="font-medium">Required</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <aside className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
        Do not upload identity documents, privileged legal advice, customer data or secrets. Store redacted references and digest-backed evidence only.
      </aside>
    </main>
  );
}
