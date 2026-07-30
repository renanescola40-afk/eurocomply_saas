# ADR — Enterprise Operations Platform Closeout

## Status

Proposed

## Context

The repository already contains substantial enterprise, billing, AI-governance, legal-rules, evidence, trust, and runtime-closeout foundations. The remaining risk is fragmentation: foundational schemas and workflows may exist without one integrated product experience or one exact-SHA operational proof chain.

## Decision

Use one long-lived Mega PR branch as the integration surface for the remaining repository-controlled work. Commits must remain independently reviewable by domain, but the final pull request must present one coherent product and runtime closeout.

The implementation sequence is:

1. establish canonical server-side organization context and reusable authorization boundaries;
2. productize Digital Twin, evidence, controls, regulatory impact, vendors, and agents;
3. add executive aggregation and reporting without duplicating source-of-truth domains;
4. prove billing, database, deployment, and legal-rules behavior for one exact SHA;
5. promote sanitized evidence through human-reviewed pull requests;
6. run the final fail-closed closeout orchestrator.

## Consequences

- A larger PR requires strict commit organization and focused contracts.
- Runtime and human-review work cannot be represented as complete by static code.
- The machine-readable manifest remains `OPEN` until each dimension is independently proven.
- Database migrations must be additive and rollback-aware.
- UI aggregation must query canonical domains rather than create parallel data models.

## Rejected alternatives

### Multiple unrelated small PRs

Rejected because they would increase integration drift and leave the user repeatedly coordinating interdependent changes.

### Marking the foundations complete without product UI

Rejected because schemas and domain tests alone do not create a usable enterprise product.

### Treating CI success as production readiness

Rejected because Stripe, Supabase, Vercel, and evidence promotion require protected runtime proof.

### Simulating qualified reviews

Rejected because reviewer identity, qualifications, independence, opinion, and acceptance are external human facts.
