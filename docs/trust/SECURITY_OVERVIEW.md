# Security overview

Status: customer-safe security overview for enterprise evaluation. This document reflects repository implementation and documented operational gaps as of this release candidate. It must not be used to claim SOC 2, ISO 27001 certification, completed penetration testing, tested disaster recovery, or contractual 24/7 monitoring.

## Current posture

EuroComply is a Next.js application backed by Supabase for authentication, database, storage, and server-side administrative operations. Public trust and security routes are available through localized routes such as `/[locale]/trust` and `/[locale]/security`, with non-localized paths redirected by middleware to the detected locale.

The product is designed to support enterprise security review through authenticated workspaces, organization-scoped authorization, role-based permissions, Supabase RLS migrations, audit events, controlled document workflows, and release gates. Several controls are implemented in code, while some enterprise assurance artifacts remain draft, planned, or pending runtime evidence.

## Implemented controls supported by code

| Area | Current implementation | Evidence path |
| --- | --- | --- |
| Authentication | Supabase Auth sessions are checked in middleware and server-side query helpers. | `src/middleware.ts`, `src/lib/supabase/server.ts`, `src/server/queries/auth.ts` |
| Route protection | Localized dashboard routes redirect unauthenticated users to localized login with the requested destination preserved. | `src/middleware.ts` |
| RBAC | Organization roles `owner`, `admin`, `editor`, `member`, and `viewer` map to explicit permissions. | `src/server/security/rbac.ts` |
| RLS / tenant isolation | Supabase migrations and validation scripts cover organization-scoped policies and tenant isolation evidence. | `supabase/migrations/*`, `docs/security/SUPABASE_TENANT_ISOLATION_IMPLEMENTATION.md` |
| Audit logging | Critical events can write to legacy `audit_logs` and chained `audit_events`; metadata is sanitized. | `src/lib/security/audit-log.ts`, `src/server/queries/audit-events.ts` |
| Audit integrity | Audit event hashes use SHA-256 and optional HMAC signing where `AUDIT_CHAIN_SIGNING_SECRET` is configured. | `src/server/security/audit-chain.ts` |
| Admin data access | Service-role Supabase client is `server-only` and requires server-side `SUPABASE_SERVICE_ROLE_KEY`. | `src/lib/supabase/admin.ts` |
| Release gates | Security scripts cover RLS, API guards, auth, authorization, logs, headers, upload, billing, and release evidence. | `package.json`, `scripts/security/*` |

## Explicit non-claims

EuroComply is not currently ISO 27001 certified. EuroComply does not currently have a SOC 2 Type I or Type II report. A third-party penetration test has not completed. Audit events include hash-chain integrity controls, but the product must not be described as WORM-backed or externally immutable unless separate storage and evidence exist. Formal backup restore and disaster recovery exercises have not yet been completed.

## Customer-safe language

Use: "EuroComply is designed to support enterprise security review with authenticated workspaces, organization-scoped RBAC, Supabase RLS migrations, audit events, and release evidence gates. Current certifications and external assurance artifacts are disclosed separately."

Do not use: "SOC 2 compliant", "ISO 27001 certified", "pentested", "end-to-end encrypted", "GDPR compliant", "immutable audit log", or "24/7 monitored" unless corresponding approved evidence is attached.

## Responsible disclosure

Security reports should be sent privately to `renansilva2002@gmail.com` until a dedicated security mailbox is provisioned. Reports should include affected component, reproduction steps, impact, and whether authentication, organization isolation, billing, storage, or customer data may be affected.