# RISCK COMPLY Enterprise Architecture

Review date: 2026-07-11  
Baseline reviewed: `main` at `78b05d4a31f7cc2545d02fb24add7f187cd2a7ac`

## Purpose

This document defines the production architecture and the invariants that must remain true before RISCK COMPLY can be described as enterprise-capable. It is an engineering control document, not a certification, audit report or guarantee of compliance.

## System context

RISCK COMPLY is a multi-tenant B2B SaaS for AI governance operations and EU AI Act readiness support.

- Web/runtime: Next.js 15, React 19, TypeScript, Node.js 22.
- UI: Tailwind CSS, Radix/shadcn-style components, next-intl.
- Identity: Supabase Auth is the primary and only runtime authentication stack.
- Data: Supabase Postgres with RLS plus server-side authorization checks.
- Storage: Supabase Storage through backend-mediated upload/download flows.
- Billing: Stripe Checkout, Billing Portal and signed webhooks.
- Hosting: Vercel.
- Observability: Sentry plus structured application/security logs.
- Abuse protection: centralized origin checks, bounded request parsing and distributed rate limiting where configured.

## Authentication decision

Supabase Auth is authoritative for login, signup, session refresh, password recovery, middleware protection, onboarding, dashboard identity, server queries and RLS identity.

Clerk is not a runtime dependency in `package.json` and runtime imports are prohibited by tests. Historical migrations and documentation containing the word Clerk are retained only when removal could invalidate an already-applied database migration or evidence history. They must not be used as a second identity source.

Invariant:

```text
Supabase user id -> organization membership -> server-side permission -> tenant-scoped query/RPC -> RLS
```

A client role, organization id, plan or redirect parameter is never sufficient authorization by itself.

## Request architecture

### Public requests

Public marketing and trust routes are localized by `next-intl`. Public health is intentionally minimal. Public responses must not disclose provider credentials, environment configuration, stack traces, SQL errors, tenant identifiers or dependency internals.

### Authenticated page requests

`proxy.ts` delegates to `src/middleware.ts`, which combines locale routing and Supabase session verification. Protected pages redirect unauthenticated users to localized login with a bounded, same-origin `next` value. Authenticated entry routes redirect to onboarding.

Required flow:

```text
login/signup -> onboarding -> create organization when absent -> /dashboard/organizations
```

### API and server mutations

Sensitive routes and server actions must compose shared controls rather than reimplementing them:

1. request/correlation id;
2. authentication;
3. active organization membership;
4. server-side RBAC/ABAC permission;
5. trusted origin/CSRF control for browser mutations;
6. bounded JSON/form parsing and schema validation;
7. distributed rate limit by action plus relevant IP/user/organization dimensions;
8. tenant-scoped database query or RPC;
9. audit/security event;
10. sanitized response with `private, no-store` where applicable.

High-risk actions fail closed when Redis, step-up, malware scanning, signature verification or tenant context is unavailable.

## Multi-tenant data model

Tenant-scoped resources use `organization_id`. The server must derive or verify organization context from membership before querying. RLS is a defense-in-depth boundary, not a replacement for server authorization.

Required negative cases:

- tenant A cannot read/write/delete tenant B resources;
- viewer cannot perform administrative or billing actions;
- unaffiliated users receive 403 without resource existence disclosure;
- object identifiers cannot bypass organization scoping;
- signed storage URLs are created only after membership and document permission checks.

## Security boundaries

- Browser boundary: CSP, secure headers, origin controls, no sensitive server modules in client bundles.
- Identity boundary: verified Supabase session, no duplicate auth stack.
- Tenant boundary: membership + permission + `organization_id` + RLS.
- Payment boundary: Stripe secret keys server-only; webhook raw body and signature verification before dispatch.
- Upload boundary: type/signature/size/path validation, tenant path, real scanner for enterprise, clean-only verdict.
- Observability boundary: structured redacted logs and Sentry configuration without avoidable PII.
- Release boundary: immutable commit/build SHA, runtime smoke, current-commit evidence and rollback proof.

## Module ownership

- `src/middleware.ts`: locale and page session boundary only.
- `src/server/security/*`: reusable security primitives and fail-closed policy.
- `src/server/auth/*` and Supabase server helpers: identity/session resolution.
- `src/server/queries/*`: read models with explicit tenant scope.
- `src/server/actions/*`: mutations with auth, permission, validation and audit.
- `src/app/api/*`: external/internal HTTP adapters; no business authorization delegated to the client.
- `scripts/security/*`: static and live security evidence gates.
- `scripts/release/*`: release orchestration, smoke, rollback and evidence validation.
- `docs/security/evidence/runtime/*`: redacted evidence only; placeholders must remain blocking.

## Reliability and observability

Every critical request should have a request/correlation id propagated to structured logs, security events and Sentry. Readiness is token-protected and dependency-aware; health remains public and simple. Sensitive/readiness responses use no-store.

Release observability requires:

- Sentry DSN configured without PII defaults;
- source maps uploaded for enterprise releases;
- protected observability smoke against the promoted deployment;
- alerts mapped to a named owner and escalation path;
- fallback access to structured provider/application logs.

## Deployment architecture

A production candidate is valid only when the exact promoted commit passes deterministic install, lint, typecheck, tests, production build, mandatory production-like E2E, security CI, live RLS, deployment smoke, observability smoke and rollback dry-run.

`npm run release:production-final` is fail-closed and requires current runtime evidence. Green repository CI is not equivalent to enterprise production approval.

## Known architecture risks

1. Runtime evidence in the repository is incomplete or tied to older commit SHAs.
2. External security review/pentest evidence is intentionally Open.
3. Backup restore drill, measured RPO/RTO and current production capacity proof are not complete.
4. Production observability and deployment smoke evidence are not Complete for the reviewed commit.
5. Historical Clerk-named migrations can confuse maintainers; they must remain clearly non-runtime.

## Change rules

- Do not introduce a second authentication provider without an approved migration plan.
- Do not bypass RLS or use service-role credentials in browser code.
- Do not add large dependencies for controls available in Node/platform primitives.
- Do not weaken a blocking evidence placeholder to make a release green.
- Do not market implementation intent as certification, audit or guaranteed compliance.
- Any tenant, auth, billing, upload or release change requires negative tests and current evidence.
