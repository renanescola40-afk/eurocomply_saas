# Security Evidence V1.2 — Authorization Call-Path Review

**Date:** 2026-10-14. **Source baseline:** `857ddfb21d0135df3a026ad480da5945119b175c`. **Mode:** GitHub read-only source review; no execution, production access, email or deployment.

## Source-inspected authorization controls

- `src/server/security/api-guards.ts`: `requireApiUser()` resolves current user, `requireOrganizationAccess()` checks membership and tenant MFA, `requirePermission()` delegates to RBAC, and `assertApiResourceOrganization()` rejects mismatched resource tenants. The error function returns sanitized API errors. **IMPLEMENTED source inspection; not runtime-tested**.
- `src/server/security/rbac.ts`: filters inactive memberships, checks role and permission, license/plan authority and tenant MFA. Database errors deny access (503). **IMPLEMENTED source inspection; not runtime-tested**.
- `src/app/api/ai-systems/[id]/route.ts`: GET and PATCH request authentication, current organization and a specific permission; access to AI-system records is passed both record id and organization id; PATCH also checks trusted origin, bounded JSON, rate limiting and audit persistence. **Source code supports an intended organization-aware guard chain, but dependent functions and actual runtime behavior remain unverified**.
- `src/server/queries/members.ts`: queries constrain records by `organization_id`. The exported functions accept organization ids but do not themselves authenticate the caller; all call sites need inspection. **Source boundary identified; caller audit OPEN**.

## Specific review finding — legacy membership fallback

**Finding ID:** DG-SEC-001  
**Severity:** High priority for investigation, **not a confirmed exploitable vulnerability**.  
**Path:** `src/server/security/rbac.ts`, `getOrganizationMembership`.  
**Trigger/precondition:** Database query returns Postgres SQLSTATE `42703` for absent membership status column.  
**Observed source behavior:** fallback selects membership without status and constructs `status: 'active'` for a matching row.  
**Potential impact:** A record that should be inactive may be treated as active under legacy schema assumptions. Whether any currently deployed database has this shape or uses a separate revocation authority is unknown.  
**Safe remediation:** verify schema migration history and actual non-production database state; define explicit, dated end condition for legacy fallback. Remove fallback on isolated branch only once compatibility and tests are established, or fail closed for unverifiable status.  
**Evidence required:** migration proof, isolated negative tests for inactive/suspended membership and missing status column, deployment mapping.  
**Current status:** SOURCE-OBSERVED DESIGN RISK / RUNTIME UNVERIFIED. No production changes authorized.

## Additional review limitation

`src/server/security/api-guards.ts` sanitizes organization ids for presence only in `sanitizeOrganizationId`; individual callers must validate format or ensure the value is obtained from trusted server context. No exploitability conclusion follows without route-level input provenance review.

## Review accounting

Eight-control preliminary matrix: **6/8 (75%) with one or more directly inspected source references**: privileged admin boundary, public-secret guard, inventory check, tenant-membership/RBAC, step-up static checker, incident response. Pentest and audit-chain runtime proof remain unverified in this sample. Earlier classification of RLS checker source inspection is also retained as an *auxiliary* reference; this overlap does not count twice.

**75% = reference inspection coverage of this deliberately small initial matrix, NOT security effectiveness, certification, runtime proof, or completion of comprehensive technical audit. Remaining matrix source-reference gap: 25%.** Full internal assurance completion is not quantifiable yet.

## Non-interference attestation

Source retrieval and documentation only. No production tests, account or data mutations, Auth/RLS changes, secret rotations, deployments, main merges, live Stripe actions or external emails were performed.
