# Architecture and Data Flows

## System boundary

```text
User browser
  -> Next.js public and authenticated routes
  -> Supabase Auth session validation
  -> server route/action/query authorization
  -> organisation membership and RBAC
  -> Supabase/Postgres tenant-scoped records and RLS
  -> optional external providers (Stripe, email, observability, analytics, AI)
  -> audit, evidence and release artifacts
```

## Identity and tenant model

Supabase Auth is the active identity provider. The server resolves the authenticated user and validates organisation membership before sensitive reads or writes. Browser-provided organisation identifiers are untrusted until checked against server-side membership. Tenant-scoped tables use organisation/workspace identifiers and RLS where applicable.

## Primary data categories

- account and authentication identifiers;
- organisation, membership, role and invitation data;
- AI-system inventory and intended-purpose data;
- risk/classification inputs and decisions;
- evidence, documents, tasks, approvals and audit logs;
- vendors, model/provider details and due-diligence data;
- FRIA, prohibited-practice, transparency and high-risk workflow records;
- incident and post-market records;
- billing, subscription and tax-related records;
- support, security and operational telemetry;
- reviewer identity and professional-review metadata when a qualified review occurs.

## Data-flow controls

1. Public pages load without tenant data.
2. Authentication exchanges occur through Supabase Auth and configured OAuth callbacks.
3. Authenticated requests are validated server-side.
4. Membership and role checks occur before tenant data access.
5. Input is validated and bounded.
6. Sensitive responses use no-store where required.
7. Database access remains tenant-scoped and subject to RLS/server guards.
8. External providers receive only the data required for their configured service.
9. Security and audit events are recorded without unnecessary secrets or PII.
10. Generated review artifacts must remain private unless deliberately redacted for sharing.

## External-provider categories

The repository supports or references the following provider categories. “Supported” does not mean enabled in production.

| Category | Example | Data purpose | Activation evidence required |
|---|---|---|---|
| Authentication/database/storage | Supabase | identity and application records | runtime configuration and contract/DPA verification |
| Billing | Stripe | checkout, subscription and payment metadata | live configuration and webhook evidence |
| Error monitoring | Sentry | application diagnostics | environment configuration and data-scrubbing evidence |
| Product analytics | PostHog EU | consented product analytics | consent, region and configuration evidence |
| Email | configured provider | transactional/support communications | provider configuration and DPA verification |
| AI/model provider | configured model API | permitted AI-assisted features | exact provider/model, retention and training-use evidence |
| Deployment | Vercel or compatible | hosting and runtime | deployment configuration and region evidence |

## Review-document flow

Qualified legal-review material must use private, organisation-scoped storage, expiring signed URLs, reviewer-scoped access, audit events, revocation and retention controls. Confidential advice and unredacted reviewer personal data must not be committed to a public repository. Git should contain only safe templates, redacted references, hashes and non-confidential metadata.

## Open data-flow decisions

- final list of active subprocessors and legal entities;
- processing/storage regions;
- international transfer mechanisms;
- AI-provider training and retention settings;
- production retention schedule and backup lifecycle;
- support and incident-notification channels;
- whether reviewer materials require privilege/confidentiality labels in each jurisdiction.
