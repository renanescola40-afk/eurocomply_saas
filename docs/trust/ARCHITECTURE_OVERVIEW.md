# Architecture overview

Status: architecture documentation for enterprise procurement. This document describes the architecture evidenced in the repository; it does not claim external certification or production operating history beyond available evidence.

## System shape

EuroComply is a localized Next.js application with a public marketing/trust surface and authenticated organization workspaces. The root route redirects to a locale-specific page. Public routes include pricing, resources, FAQ, about, contact, trust, security, compliance, data processing, SLA, privacy, terms, DPA, subprocessors, and status. Private routes require a Supabase-authenticated session.

```text
Browser
  -> Next.js middleware
       -> locale detection and public-route allowlist
       -> Supabase Auth session check for private routes
  -> Next.js App Router pages / route handlers / server actions
       -> server-side authorization and validation
       -> Supabase Auth, Postgres, Storage, and admin service-role operations
       -> Stripe billing flows where configured
       -> audit logging and release/security evidence scripts
```

## Main components

| Component | Responsibility | Evidence |
| --- | --- | --- |
| Next.js App Router | Public pages, private dashboard routes, route handlers, server actions. | `src/app`, `src/components` |
| Middleware | Locale routing, public/private route decisions, Supabase session refresh/copy, login redirects. | `src/middleware.ts` |
| Supabase Auth | User identity and session verification. | `src/lib/supabase/server.ts`, `src/server/queries/auth.ts` |
| Supabase Postgres | Organization data, documents metadata, vendors, risks, subscriptions, audit events. | `supabase/migrations/*` |
| Supabase Storage | Controlled document storage when configured. | `src/lib/evidence/storage.ts`, upload/security docs |
| Server-only admin client | Backend-only service-role operations. | `src/lib/supabase/admin.ts` |
| RBAC module | Organization role normalization, permissions, denial responses, denial audit events. | `src/server/security/rbac.ts` |
| Audit module | Legacy audit writes plus hash-chain audit event creation and listing. | `src/lib/security/audit-log.ts`, `src/server/queries/audit-events.ts` |
| Billing routes | Stripe checkout, portal, and webhook processing where configured. | `src/app/api/billing/*`, release evidence checklist |
| Security scripts | Static and runtime checks for RLS, auth, authorization, API guards, logging, public errors, upload, billing, supply chain, and release readiness. | `scripts/security/*`, `package.json` |

## Trust boundaries

1. Browser clients receive public data and authenticated session cookies. They must not receive service-role secrets.
2. Next.js middleware and server code are responsible for session validation and private-route enforcement.
3. Supabase RLS is the database-level tenant boundary for authenticated database access. Service-role access bypasses RLS and must remain server-only.
4. Stripe handles payment card data; the application stores subscription and billing metadata, not raw card data.
5. Provider logs and observability tools may process operational metadata and must be listed in the subprocessors register when enabled.

## Data flow summary

- Anonymous visitors access public localized pages and trust materials.
- Authenticated users enter organization workspaces after Supabase session validation.
- Server-side code checks organization membership and permissions before sensitive operations.
- Database access is organization-scoped through query filters and Supabase RLS policies.
- Critical actions are intended to generate audit events with sanitized metadata.
- Billing events are processed through server-side routes and are expected to verify provider signatures in production.

## Architecture gaps and non-claims

The architecture is designed to support enterprise review, but some evidence remains pending. Live RLS validation must pass against the target Supabase project before claiming verified tenant isolation in production. Formal disaster recovery, backup restore, and third-party penetration test evidence are not complete. ISO 27001 and SOC 2 are not current certifications.