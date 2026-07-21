# ADR: Regulatory Control Tower Integration Boundary

## Status

Accepted for repository implementation. Underlying workflow mutation APIs and live runtime proof remain separate promotion gates.

## Context

The repository contains dedicated domains for AI Literacy, FRIA, prohibited practices, high-risk provider data governance, Annex IV, QMS and conformity operations.

Those domains were technically isolated. A customer or operator could not see one trustworthy tenant-scoped summary of which workflows existed, which were progressing, which were approved and which were blocked.

Using the dashboard's general compliance score for this purpose would be misleading because that score has a different model and can combine tasks, documents and risk records. Using the canonical enterprise scorecard would also be incorrect because it measures platform assurance rather than customer regulatory workflow activation.

## Decision

Create a read-only Regulatory Control Tower with three layers:

1. a deterministic domain aggregator;
2. an organization-scoped query module;
3. a tenant-scoped API and localized dashboard page.

The aggregator exposes two separate metrics:

- activation: a persisted current workflow exists;
- readiness: the current persisted lifecycle state is ready or reviewed as not applicable.

A blocked workstream takes precedence over aggregate readiness.

## Security boundary

- The browser never receives service-role credentials.
- Authorization occurs before administrative database reads.
- Every query includes `organization_id`.
- Storage errors fail closed instead of returning partial or empty data.
- The endpoint is read-only.
- Distributed rate limiting protects the aggregated query path.
- Responses are no-store and errors are sanitized.
- Evidence content and reviewer notes are excluded from the payload.

## Product boundary

The control tower is not the canonical product scorecard and does not mutate it.

A 100% control-tower readiness result means only that every integrated workflow's latest persisted lifecycle state is ready or reviewed as not applicable. It does not prove evidence truth, legal sufficiency, production migration, external acceptance, certification or market authorization.

## Alternatives rejected

### Reuse the dashboard compliance score

Rejected because it combines different operational inputs and would blur regulatory-workflow state with general task completion.

### Query each workflow directly from the browser

Rejected because this would distribute authorization and error handling, increase request volume and risk partial-state rendering.

### Add multi-domain writes in the first integration

Rejected because write workflows require domain-specific Zod schemas, state-transition validation, trusted-origin checks, rate limits, audit persistence and compensation. A generic mutation endpoint would weaken those boundaries.

### Treat missing tables as empty workstreams

Rejected because an unavailable or unapplied workflow schema is not the same as a valid organization with no records.

## Consequences

### Positive

- Customers receive one operational regulatory view.
- Blocked workstreams are visible across domains.
- Tenant filtering and error semantics are centralized.
- Navigation exposes the integrated regulatory layer.
- Future domain editors can attach to one stable overview.

### Costs

- The first version is read-only for most workstreams.
- The latest record is used as the current lifecycle signal; workflow-specific version-selection rules may later require explicit current-version markers.
- Live database and two-tenant proof remain required.
- Customer-facing labels currently use canonical English workstream names while interface chrome is localized.

## Validation required

Before scorecard promotion:

- exact-head lint, typecheck, unit tests and production build;
- API route inventory validation;
- live positive and negative organization-scoped reads;
- proof that one failed query rejects the full snapshot;
- accessibility and localization review;
- validation against organizations with no records, drafts, approved, blocked, not-applicable and retired workflows;
- product and legal review of claims and metric labels.

## Rollback

Remove the API route, query module, aggregator, dashboard page, navigation entry, tests and documentation together.

No database rollback is required because this package introduces no schema or customer-data mutation.
