# API Route Inventory

This inventory is the explicit classification source for `src/app/api/**/route.ts` and `src/app/next_api/**/route.ts`. The security scanner fails when an API route exists without an entry, when the inventory contains a route that no longer exists, when a mutating/private route does not prove the expected central guard coverage.

## Classification taxonomy

| Class | Required controls |
| --- | --- |
| public safe | No private tenant data; no-store where applicable; rate limit for public verifiers. |
| public mutation | Public POST without tenant session; bounded input parsing, no-store responses, rate limiting, consent or enumeration-resistance validation, and sanitized logging required. |
| authenticated | User auth required; sanitized error responses; no-store responses. |
| tenant-scoped | Auth, organization membership, tenant ownership validation before resource use, RBAC/read permission, no-store. |
| admin-only | Auth, membership or global platform authority, admin/RBAC capability, tenant validation where applicable, no-store, audit for sensitive changes. |
| high-risk | Auth, trusted origin for browser mutations, Zod/body validation, rate limit, RBAC, tenant validation, audit/step-up where sensitive. |
| integration | Bearer/service credential authentication, tenant binding from the credential, bounded mutation payloads, distributed fail-closed rate limiting, entitlement enforcement, no-store and sanitized protocol errors. Browser Origin is not an authorization source. |
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
| `src/app/api/internal/enterprise-provisioning/route.ts` | health/internal | Internal bulk-provisioning worker; requires cron/internal authorization, fail-closed authentication rate limiting, bounded leased batches, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-contract-lifecycle/route.ts` | health/internal | Internal contract lifecycle scheduler; requires cron/internal authorization, bounded batches, fail-closed rate limiting, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-usage-alerts/route.ts` | health/internal | Internal Enterprise usage-threshold scheduler; requires cron/internal authorization, bounded batches, fail-closed rate limiting, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-group-access-reconciliation/route.ts` | health/internal | Internal SCIM group-access reconciliation worker; requires cron/internal authorization, fail-closed authentication rate limiting, bounded tenant-scoped batches, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-group-access-reconciliation/drain/route.ts` | health/internal | Protected bounded queue drain endpoint; requires internal authorization, fail-closed authentication rate limiting, server-configured actor identity, a maximum of 100 jobs per invocation, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-group-access-reconciliation/prune/route.ts` | health/internal | Protected completed-job retention endpoint; requires internal authorization, fail-closed authentication rate limiting, bounded retention between 7 and 365 days, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-group-access-reconciliation/replay/route.ts` | health/internal | Protected dead-letter replay endpoint; requires internal authorization, fail-closed authentication rate limiting, bounded JSON, both job and organization identifiers for tenant binding, sanitized errors and no-store responses. |
| `src/app/api/internal/enterprise-group-access-reconciliation/status/route.ts` | health/internal | Protected queue health endpoint; requires internal authorization, fail-closed authentication rate limiting, aggregate-only backlog and age telemetry, sanitized errors and no-store responses. |
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
| `src/app/api/enterprise/v1/members/route.ts` | integration | Enterprise provisioning API; bearer credential supplies tenant boundary, bounded payload validation, entitlement and seat enforcement, distributed fail-closed rate limiting, audit and no-store responses required. |
| `src/app/api/platform/contracts/route.ts` | admin-only | Global contract provisioning; authenticated platform capability, AAL2 MFA, trusted origin, bounded JSON, fail-closed rate limiting, organization validation, database role recheck and audit required. |
| `src/app/api/platform/contracts/billing/route.ts` | admin-only | Negotiated Enterprise billing mutation; platform billing capability, AAL2 MFA, trusted origin, bounded validation, expected-state checks, fail-closed rate limiting and audit required. |
| `src/app/api/platform/contracts/status/route.ts` | admin-only | Global contract lifecycle mutation; authenticated platform capability, AAL2 MFA, trusted origin, bounded JSON, fail-closed rate limiting, expected-state transition, reason and audit required. |
| `src/app/api/platform/organizations/route.ts` | admin-only | Global organization creation and directory; platform capability, AAL2 MFA, trusted origin for mutations, bounded validation, fail-closed rate limiting and audit required. |
| `src/app/api/platform/organizations/[organizationId]/usage/route.ts` | admin-only | Global read-only tenant licensing usage; authenticated platform capability, AAL2 MFA, organization UUID validation and no-store response required. |
| `src/app/api/platform/organizations/[organizationId]/api-keys/route.ts` | admin-only | Show-once Enterprise API credential issuance; platform security capability, AAL2 MFA, trusted origin, bounded validation, tenant and entitlement checks, digest-only persistence and audit required. |
| `src/app/api/platform/organizations/[organizationId]/provisioning-jobs/route.ts` | admin-only | Global CSV provisioning creation/status; authenticated platform capability, AAL2 MFA, trusted origin and fail-closed rate limit for mutations, bounded CSV JSON, tenant UUID validation, database operator recheck and no-store responses required. |
| `src/app/api/platform/provisioning-jobs/actions/route.ts` | admin-only | Manual job process/cancel controls; authenticated platform capability, AAL2 MFA, trusted origin, bounded JSON, fail-closed rate limiting and database operator recheck required. |
| `src/app/api/platform/organizations/[organizationId]/scim-tokens/route.ts` | admin-only | Show-once SCIM token issuance; platform security capability, AAL2 MFA, trusted origin, bounded JSON, fail-closed rate limit, organization/connection validation, SCIM entitlement and digest-only persistence required. |
| `src/app/api/platform/organizations/[organizationId]/sso-connections/route.ts` | admin-only | Audited SAML provider binding; platform security capability, AAL2 MFA, trusted origin, bounded JSON, fail-closed rate limit, verified domain/provider uniqueness, SSO entitlement and database role recheck required. |
| `src/app/api/team/invites/route.ts` | admin-only | Team invite mutation; manage_team and tenant membership required. |
| `src/app/api/team/imports/csv/route.ts` | admin-only | Tenant CSV import creation/status; current organization from the authenticated session, manage_team, Enterprise entitlement, trusted origin, fail-closed rate limit, step-up MFA, bounded CSV JSON and job-level quota reservation required. |
| `src/app/api/team/invitations/cancel/route.ts` | admin-only | Team invitation cancellation; manage_team and tenant validation required. |
| `src/app/api/team/members/role/route.ts` | admin-only | Role mutation; manage_team, step-up/audit and tenant member lookup required. |
| `src/app/api/team/members/seat/route.ts` | admin-only | Seat change, suspension and reactivation; manage_team, tenant member lookup, trusted origin, fail-closed rate limit, step-up, contract quota enforcement and database audit required. |
| `src/app/api/team/members/remove/route.ts` | admin-only | Member removal; manage_team, rate limit, origin, audit required. |
| `src/app/api/team/group-access-policies/route.ts` | admin-only | Tenant group-access policy preview and mutation; authenticated organization context, `manage_team`, trusted origin, bounded JSON, fail-closed rate limiting, step-up authentication, optimistic concurrency, conflict and last-admin protection, service-role RPC persistence, audit evidence and no-store responses required. |
| `src/app/api/scim/v2/ServiceProviderConfig/route.ts` | integration | SCIM bearer authentication, tenant entitlement, distributed fail-closed rate limit, no-store and protocol-formatted errors. |
| `src/app/api/scim/v2/ResourceTypes/route.ts` | integration | Authenticated SCIM discovery with tenant-bound token, distributed rate limit and no-store response. |
| `src/app/api/scim/v2/Schemas/route.ts` | integration | Authenticated SCIM schema discovery with tenant-bound token, distributed rate limit and no-store response. |
| `src/app/api/scim/v2/Users/route.ts` | integration | SCIM user create/list; bearer token supplies tenant, mutation body is bounded, seats are reserved transactionally and list/filter responses remain tenant-scoped. |
| `src/app/api/scim/v2/Users/[id]/route.ts` | integration | SCIM user read/PATCH/DELETE; bearer tenant binding, bounded PatchOp, transactional seat change/reactivation and seat release on deactivation. |
| `src/app/api/scim/v2/Groups/route.ts` | integration | SCIM group create/list; bearer token supplies the tenant boundary, mutation bodies are bounded, member identities are validated in the same organization and responses remain no-store. |
| `src/app/api/scim/v2/Groups/[id]/route.ts` | integration | SCIM group read/PUT/DELETE; bearer tenant binding, atomic full-membership replacement, same-tenant active-member validation, distributed fail-closed rate limiting and no-store protocol responses. |
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
| `src/app/api/ai-systems/route.ts` | high-risk | AI governance inventory; GET is tenant-scoped, while mutations require trusted origin, bounded validation, distributed rate limiting, workflow-specific RBAC, tenant ownership checks and durable audit persistence. |
| `src/app/api/ai-literacy/route.ts` | high-risk | Article 4 training and evidence operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, tenant ownership validation and durable audit compensation. |
| `src/app/api/ai-governance/regulatory-control-tower/route.ts` | tenant-scoped | Read-only aggregation of tenant-scoped regulatory workflow states; requires authentication, active organization, read_ai_governance, distributed fail-closed rate limiting, organization filters, no-store and sanitized errors. |
| `src/app/api/ai-governance/fria/route.ts` | high-risk | FRIA lifecycle and evidence operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, tenant ownership validation, deterministic re-evaluation and durable audit compensation. |
| `src/app/api/ai-governance/prohibited-practices/route.ts` | high-risk | Article 5 review, signal, evidence and approval operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, organization-scoped evidence, optimistic concurrency, atomic approval and durable audit events. |
| `src/app/api/ai-governance/provider-data/route.ts` | high-risk | Article 10 provider-data programme, dataset and approval operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, organization-scoped ownership checks, optimistic concurrency, atomic approval and durable audit compensation. |
| `src/app/api/ai-governance/annex-iv/route.ts` | high-risk | Article 11 and Annex IV package, section, evidence and approval operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, organization-scoped ownership checks, optimistic concurrency, SHA-256 evidence integrity, atomic approval and durable audit compensation. |
| `src/app/api/ai-governance/qms/route.ts` | high-risk | Article 17 QMS lifecycle, controls, CAPA, audit, management review and approval operations; GET is tenant-scoped, while mutations require trusted origin, bounded Zod input, distributed fail-closed rate limiting, manage_ai_governance, server-resolved organization scope, optimistic concurrency and durable audit compensation. |
| `src/app/api/ai-systems/[id]/route.ts` | high-risk | AI governance detail/reassessment endpoint; GET requires tenant-scoped read_ai_governance, PATCH requires trusted origin, rate limit, Zod body validation, manage_ai_governance, tenant ownership validation, no-store and audit. |
| `src/app/api/ai-incidents/route.ts` | tenant-scoped | AI incident collection; auth, tenant membership, RBAC read/manage permission, bounded mutation input, origin and rate-limit controls. |
| `src/app/api/ai-incidents/[id]/route.ts` | high-risk | AI incident detail and lifecycle mutation; GET is tenant-scoped, while PATCH requires trusted origin, manage_ai_incidents, bounded Zod input, distributed rate limiting, optimistic concurrency, tenant-bound AI-system references, atomic history and durable chained audit persistence. |

## Legacy route namespace

There are currently no registered `src/app/next_api/**/route.ts` endpoints. If any legacy `next_api` route is reintroduced, it must be added to this inventory and pass the same auth, tenant, origin, rate-limit, validation, no-store, and sanitized-error gates as `src/app/api`.

## BOLA/IDOR invariants

Every tenant-scoped resource must be loaded from the server and checked against the active organization before returning or mutating it. Client-supplied IDs are selectors only; they never establish authorization.

Global platform routes must validate an enabled platform role, required capability and AAL2 MFA, then revalidate organization/contract ownership and operator role in the database. Organization membership alone never authorizes a platform route.

SCIM and other integration routes derive `organization_id` from a verified credential. A request body, URL parameter or external identity identifier never chooses or expands the tenant boundary.

## Required negative tests

Security tests must assert that unauthenticated requests return 401, missing membership returns 403, viewer attempting admin mutation returns 403, tenant A attempting tenant B resource access returns 403/404, invalid origin returns 403, invalid body returns 400, internal errors return sanitized responses without stack traces, and legitimate signed webhooks continue to pass. Public account recovery must additionally prove generic account-existence responses, fail-closed abuse controls, same-origin redirect construction, and sanitized provider failures.
