# Decision: Preserve truthful tenant attribution for unresolved document-download denials

- **Status:** Proposed
- **Date:** 2026-07-15
- **Owners:** Security Engineering and Platform Engineering
- **Related issue/PR:** https://github.com/renanescola40-afk/eurocomply_saas/pull/1062
- **Priority:** P1

## Context

The signed-document URL server action performs a tenant-scoped lookup across every organization available to the authenticated user. When that lookup returns no accessible document, the application cannot distinguish an unknown identifier from a document owned by another tenant.

The prior denial audit used `organizationIds[0]` as the event organization for `document_not_found_or_cross_tenant`. That value represents only the caller's first membership and is not evidence that the attempted document belongs to that organization. Recording it could place a denial in an unrelated tenant chronology and create misleading audit attribution.

This finding is based on repository source only. It does not claim observed production misuse, customer impact, external-audit findings, or penetration-test results.

## Evidence

- `src/server/actions/document-downloads.ts`: unresolved lookup path previously selected `organizationIds[0]`.
- `tests/security/document-storage-access-hardening.test.ts`: focused source-contract coverage for the unresolved denial block.
- Pull request #1062 diff and required GitHub checks on the exact head SHA.
- No runtime logs, production database records, customer data, provider telemetry, or external audit evidence were used.

## Candidate options

### Option A — Record the caller's first organization membership

- Benefits: preserves an organization-scoped value for every denial event.
- Risks: asserts tenant ownership without evidence and can pollute an unrelated tenant chronology.
- Implementation effort: none; this is the previous behavior.
- Operational cost: potential investigation confusion and misleading organization-level audit views.
- Maintenance cost: low code cost, high semantic risk.
- Migration complexity: none.
- Reversibility: immediate.

### Option B — Record unresolved denials as organization-neutral

- Benefits: avoids false tenant attribution while preserving actor, normalized document identifier, access purpose, and membership count.
- Risks: organization-filtered views may omit unresolved denials when they exclude global events.
- Implementation effort: one attribution change, focused regression coverage, and this decision record.
- Operational cost: investigators may need a global security-event view for unresolved lookups.
- Maintenance cost: low; the boundary is explicit and tested.
- Migration complexity: none.
- Reversibility: immediate through a code revert.

### Option C — Resolve ownership with a privileged cross-tenant lookup

- Benefits: could identify the actual tenant for existing documents.
- Risks: expands access to cross-tenant metadata, weakens anti-enumeration boundaries, and increases privacy and authorization risk.
- Implementation effort: high.
- Operational cost: additional privileged-query monitoring and incident-response obligations.
- Maintenance cost: high.
- Migration complexity: possible policy, RLS, and audit-model changes.
- Reversibility: materially harder than Options A or B.

## Decision framework

- **Customer and business value:** Option B preserves trustworthy audit chronology without changing the public response.
- **Production readiness:** Option B is a small, reviewable, migration-free change.
- **Security and privacy:** Option B avoids unsupported tenant association and does not introduce privileged cross-tenant reads.
- **Reliability and observability:** Option B makes event semantics truthful, with the trade-off that global event visibility remains operationally important.
- **Performance and infrastructure cost:** Options A and B are equivalent; Option C adds database and monitoring cost.
- **Architecture and maintainability:** Option B establishes a clear boundary: tenant attribution is present only when repository logic has resolved the tenant.
- **Implementation risk:** Option B has the lowest risk while correcting the defect.
- **Opportunity cost:** Option C would consume substantially more engineering and review effort for no required product behavior.
- **ROEI:** Option B provides the strongest audit-integrity improvement for the smallest reversible change.

## Decision

Select Option B. For `document_not_found_or_cross_tenant`, record the denial with `organizationId: null` while retaining the actor, normalized document identifier, access purpose, and membership count.

Continue using the resolved document organization for later paths where the tenant is known, including permission denial, invalid tenant storage path, signed-URL provider failure, and successful signed-URL creation.

Option A is rejected because it fabricates tenant attribution. Option C is rejected because it introduces unnecessary privileged cross-tenant access and conflicts with the existing anti-enumeration boundary.

## Scope

### Included

- The unresolved or potentially cross-tenant signed-document lookup denial path.
- Focused regression coverage preventing reuse of `organizationIds[0]` in that path.
- Documentation of operational and evidence limitations.

### Excluded

- Changes to public error text or anti-enumeration behavior.
- Schema, migration, RLS, RBAC, entitlement, dependency, provider, or secret changes.
- A new global audit-event user interface.
- Historical audit-data rewriting.
- Production runtime validation or external audit claims.

## Consequences

### Positive

- Unknown and potentially cross-tenant lookup denials are no longer attributed to an arbitrary membership.
- Tenant-scoped audit timelines avoid false organization chronology.
- Authentication, membership lookup, permission checks, fail-closed rate limiting, tenant-scoped lookup, path validation, signed-URL expiry, and success auditing remain unchanged.
- The external response remains `Document not found`, preserving anti-enumeration behavior.

### Negative or trade-offs

- Organization-scoped audit views may omit these events if they exclude organization-neutral records.
- Security operations must retain access to the global audit stream to investigate unresolved lookups.

### Residual risks

- The event retains a normalized attempted document identifier; existing audit access and retention controls remain the mitigation.
- Source-contract coverage verifies repository structure, not production persistence or semantic behavior under every provider failure.
- Existing global-event visibility may be insufficient operationally; review this if incident exercises show an investigation gap.

## Compatibility and migration

The change is backward compatible for API consumers and successful document downloads. It does not change the response contract, database schema, RLS policies, storage provider configuration, credentials, or customer workflow.

No migration or historical-data repair is performed. Previously recorded events retain their original attribution and must not be reclassified without separate evidence and review.

## Validation and measurement

- Tests and checks: focused source-contract test plus the repository's required lint, typecheck, unit, build, security, CodeQL, Semgrep, Gitleaks, dependency-review, enterprise, and release checks on the exact PR head.
- Metrics before: no trustworthy production count of falsely attributed denials is available.
- Metrics after: no production metric is created by this change.
- Measurement method: repository inspection and deterministic automated tests only.

> Measurement unavailable in the current execution environment.

## Operational impact

Deployment requires no migration, secret rotation, provider action, or planned downtime. Health, readiness, retry, idempotency, and signed-URL expiration behavior are unchanged.

Security and support investigations must query the global audit stream when an unresolved document lookup cannot be associated with a tenant. Existing audit retention, access controls, sanitization, and incident-response ownership remain authoritative.

A preview deployment can validate branch buildability but does not prove production audit persistence, storage-provider behavior, or live cross-tenant denial handling.

## Rollback

Rollback trigger: a verified regression in audit ingestion, investigation workflows, or document-download behavior attributable to this change.

Procedure:

1. Revert the commits in PR #1062, including the attribution change, focused test, and this decision record.
2. Run the full required CI and security gates on the revert SHA.
3. Deploy through the normal protected release path.
4. Do not rewrite historical audit events as part of rollback.

No migration reversal, data repair, provider restoration, credential rotation, or storage rollback is required.

## Evidence limitations

Repository inspection and automated tests do not prove production audit durability, provider behavior, authorization correctness under all runtime conditions, customer impact, certification, penetration-test results, or external-audit conclusions.

The Vercel preview is branch-preview evidence only. This decision does not create or upgrade production runtime evidence.

## Follow-up review

- Review date or trigger: after the next production audit-log incident exercise, or within 90 days of merge, whichever occurs first.
- Owner: Security Engineering.
- Conditions that would supersede this decision: a reviewed tenant-safe ownership-resolution mechanism, a dedicated security-event model for unresolved resources, or evidence that global organization-neutral events cannot be investigated reliably.