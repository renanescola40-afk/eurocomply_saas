# API Route Inventory

This inventory is the explicit classification source for `src/app/api/**/route.ts` and `src/app/next_api/**/route.ts`. The security scanner fails when an API route exists without an entry, when the inventory contains a route that no longer exists, when a mutating/private route does not prove the expected central guard coverage.

## Classification taxonomy

| Class | Required controls |
| --- | --- |
| public safe | No private tenant data; no-store where applicable; rate limit for public verifiers. |
| public mutation | Public POST without tenant session; bounded input parsing, no-store responses, rate limiting, consent or enumeration-resistance validation, and sanitized logging required. |
| authenticated | User auth required; sanitized error responses; no-store responses. |
| tenant-scoped | Auth, organization membership, tenant ownership validation before resource use, RBAC/read permission, no-store. |
| admin-only | Auth, membership, admin/RBAC permission, tenant validation, no-store, audit for sensitive changes. |
| high-risk | Auth, trusted origin for mutations, Zod/body validation, rate limit, RBAC, tenant validation, audit/step-up where sensitive. |
| webhook | Provider signature verification instead of user session; raw body preserved; no-store; no CSRF origin requirement. |
| health/internal | Health/ops/internal authorization; no tenant data exposure; no-store. |

## Route registry

| Route | Class | Notes |
| --- | --- | --- |
| `src/app/api/health/route.ts` | public safe | Liveness endpoint; no private data. |
| `src/app/api/ready/route.ts` | health/internal | Protected readiness endpoint; requires the healthcheck bearer token, returns grouped checks only, and must not expose secrets or individual environment key names. |
| `src/app/api/ready/release/route.ts` | health/internal | Protected release-metadata readiness endpoint; distributed fail-closed rate limiting runs before bearer authorization, responses are no-store, and only a normalized full runtime commit SHA with coarse provenance may be returned. |
| `src/app/api/observability/smoke/route.ts` | health/internal | Observability smoke check guarded by internal authorization and no-store contract. |
| `src/app/api/ops/smoke/route.ts` | health/internal | Ops smoke check guarded by operational authorization and no-store contract. |
| `src/app/api/ops/enterprise-readiness/route.ts` | health/internal | Ops readiness check; no tenant payloads. |
| `src/app/api/internal/trial-reminders/route.ts` | health/internal | Internal job; requires cron/internal authorization. |
| `src/app/api/internal/daily-maintenance/route.ts` | health/internal | Internal job; requires cron/internal authorization. |
| `src/app/api/internal/compliance-alerts/route.ts` | health/internal | Internal job; requires cron/internal authorization. |
| `src/app/api/internal/metric-snapshots/route.ts` | health/internal | Internal job; requires cron/internal authorization. |
| `src/app/api/internal/email/test/route.ts` | health/internal | Internal route guarded by shared internal authorization and no-store responses. |
| `src/app/api/internal/malware/cloudmersive/route.ts` | health/internal | Internal Cloudmersive malware scan adapter; requires scanner/internal authorization, bounded raw body, no-store responses and sanitized provider errors. |
| `src/app/api/intelligence/refresh/route.ts` | health/internal | Internal refresh endpoint; guarded by internal authorization. |
| `src/app/api/billing/webhook/route.ts` | webhook | Stripe webhook; signature verification replaces trusted origin. |
| `src/app/api/stripe/webhook/route.ts` | webhook | Stripe webhook; signature verification replaces trusted origin. |
| `src/app/api/audit/evidence-pack/verify/route.ts` | public safe | Public verifier; must stay rate-limited and no-store. |
| `src/app/api/leads/route.ts` | public mutation | Public lead capture stores lead PII; requires consent, bounded JSON, rate limit, input normalization, sanitized logging and no-store responses. |
| `src/app/api/prelaunch/route.ts` | public mutation | Public prelaunch waitlist capture stores lead PII; requires bounded JSON, honeypot handling, rate limit, input normalization, sanitized logging and no-store responses. |
| `src/app/api/auth/recovery/route.ts` | public mutation | Public password recovery request; requires trusted Origin, bounded JSON, fail-closed password-reset rate limiting, privacy-safe keying, generic enumeration-resistant responses, same-origin redirect construction, sanitized provider errors and no-store responses. |
| `src/app/api/billing/entitlements/route.ts` | tenant-scoped | Private subscription/entitlement data; membership and tenant context required. |
| `src/app/api/billing/checkout/route.ts` | high-risk | Billing mutation; manage_billing, trusted origin, rate limit, tenant validation required. |
| `src/app/api/billing/checkout-intent/route.ts` | high-risk | Billing mutation intent; manage_billing, trusted origin, rate limit required. |
| `src/app/api/billing/portal/route.ts` | high-risk | Billing portal session; manage_billing, origin/rate limits required. |
| `src/app/api/team/invites/route.ts` | admin-only | Team invite mutation; manage_team and tenant membership required. |
| `src/app/api/team/invitations/cancel/route.ts` | admin-only | Team invitation cancellation; manage_team and tenant validation required. |
| `src/app/api/team/members/role/route.ts` | admin-only | Role mutation; manage_team, step-up/audit and tenant member lookup required. |
| `src/app/api/team/members/remove/route.ts` | admin-only | Member removal; manage_team, rate limit, origin, audit required. |
| `src/app/api/security/settings/route.ts` | admin-only | Security settings mutation; manage_settings, step-up and audit required. |
| `src/app/api/security/step-up/challenge/route.ts` | high-risk | Step-up challenge; auth, tenant context, origin and rate limit required. |
| `src/app/api/security/step-up/verify/route.ts` | high-risk | Step-up verification; auth, tenant context, origin, rate limit, provider verification and audit required. |
| `src/app/api/documents/upload/route.ts` | high-risk | File upload; manage_documents, content scan, tenant validation and origin/rate limits required. |
| `src/app/api/documents/[id]/approval/route.ts` | high-risk | Resource mutation; fetch document and validate `organization_id` before update. |
| `src/app/api/gdpr/export/route.ts` | high-risk | Export path; auth, tenant scope, plan/permission, audit and no-store required. |
| `src/app/api/gdpr/delete-request/route.ts` | high-risk | Data deletion workflow; trusted origin, rate limit, validation and audit required. |
| `src/app/api/audit/evidence-pack/route.ts` | high-risk | Evidence pack export; auth, tenant context, RBAC, step-up, signed integrity, audit. |
| `src/app/api/audit/chain/verify/route.ts` | tenant-scoped | Private audit verification; read_audit, tenant validation, step-up and no-store required. |
| `src/app/api/security-questionnaire/export/route.ts` | high-risk | Export; export_data permission, tenant validation, integrity and audit required. |
| `src/app/api/vendor-assurance/export/route.ts` | high-risk | Export; export_data permission, tenant validation, integrity and audit required. |
| `src/app/api/enterprise-readiness/export/route.ts` | high-risk | Export; export_data permission, tenant validation, integrity and audit required. |
| `src/app/api/retention-center/export/route.ts` | high-risk | Export; export_data permission, tenant validation, integrity and audit required. |
| `src/app/api/continuity-center/export/route.ts` | high-risk | Export; export_data permission, tenant validation, integrity and audit required. |
| `src/app/api/reports/executive.csv/route.ts` | tenant-scoped | Private CSV; export RBAC, paid entitlement, single-use step-up, tenant filter, audit, rate limit and no-store hardening. |
| `src/app/api/reports/tasks.csv/route.ts` | tenant-scoped | Private CSV; export RBAC, paid entitlement, single-use step-up, tenant filter, audit, rate limit and no-store hardening. |
| `src/app/api/reports/risks.csv/route.ts` | tenant-scoped | Private CSV; export RBAC, paid entitlement, single-use step-up, tenant filter, audit, rate limit and no-store hardening. |
| `src/app/api/reports/vendors.csv/route.ts` | tenant-scoped | Private CSV; export RBAC, paid entitlement, single-use step-up, tenant filter, audit, rate limit and no-store hardening. |
| `src/app/api/reports/documents.csv/route.ts` | tenant-scoped | Private CSV; export RBAC, paid entitlement, single-use step-up, tenant filter, audit, rate limit and no-store hardening. |
| `src/app/api/ai-systems/route.ts` | tenant-scoped | AI governance data; auth, tenant membership, RBAC read/manage permission. |
| `src/app/api/ai-literacy/route.ts` | high-risk | Article 4 training and evidence operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed rate limiting, manage_ai_governance, tenant ownership validation and durable audit compensation. |
| `src/app/api/ai-systems/[id]/route.ts` | high-risk | AI governance detail/reassessment endpoint; GET requires tenant-scoped read_ai_governance, PATCH requires trusted origin, rate limit, Zod body validation, manage_ai_governance, tenant ownership validation, no-store and audit. |
| `src/app/api/ai-incidents/route.ts` | tenant-scoped | AI incident data; auth, tenant membership, RBAC read/manage permission. |

## Legacy route namespace

There are currently no registered `src/app/next_api/**/route.ts` endpoints. If any legacy `next_api` route is reintroduced, it must be added to this inventory and pass the same auth, tenant, origin, rate-limit, validation, no-store, and sanitized-error gates as `src/app/api`.

## BOLA/IDOR invariants

Every tenant-scoped resource must be loaded from the server and checked against the active organization before returning or mutating it. Client-supplied IDs are selectors only; they never establish authorization.

## Required negative tests

Security tests must assert that unauthenticated requests return 401, missing membership returns 403, viewer attempting admin mutation returns 403, tenant A attempting tenant B resource access returns 403/404, invalid origin returns 403, invalid body returns 400, internal errors return sanitized responses without stack traces, and legitimate signed webhooks continue to pass. Public account recovery must additionally prove generic account-existence responses, fail-closed abuse controls, same-origin redirect construction, and sanitized provider failures.
