# Security overview

Status: customer-safe security overview for enterprise evaluation. This document reflects repository implementation and documented operational gaps as of this release candidate. It must not be used to claim SOC 2, ISO 27001 certification, completed penetration testing, tested disaster recovery, or contractual 24/7 monitoring.

## Current posture

RISCK COMPLY is a Next.js application backed by Supabase for authentication, database, storage, and server-side administrative operations. Public trust and security routes are available through localized routes such as `/[locale]/trust` and `/[locale]/security`, with non-localized paths redirected by middleware to the detected locale.

The product is designed to support enterprise security review through authenticated workspaces, organization-scoped authorization, role-based permissions, Supabase RLS migrations, audit events, controlled document workflows, public trust documentation, and release evidence gates. Several controls are implemented in code, while some enterprise assurance artifacts remain draft, planned, or pending runtime evidence.

## Implemented controls supported by code

| Area | Current implementation | Evidence path |
| --- | --- | --- |
| Authentication | Supabase Auth sessions are checked in middleware and server-side query helpers. | `src/middleware.ts`, `src/lib/supabase/server.ts`, `src/server/queries/auth.ts` |
| Route protection | Localized dashboard routes redirect unauthenticated users to localized login with the requested destination preserved. | `src/middleware.ts` |
| RBAC | Organization roles `owner`, `admin`, `editor`, `member`, and `viewer` map to explicit permissions. | `src/server/security/rbac.ts` |
| RLS / tenant isolation | Supabase migrations and validation scripts cover organization-scoped policies and tenant-isolation evidence. | `supabase/migrations/*`, `docs/security/SUPABASE_TENANT_ISOLATION_IMPLEMENTATION.md` |
| Audit logging | Critical events can write to legacy `audit_logs` and chained `audit_events`; metadata is sanitized. | `src/lib/security/audit-log.ts`, `src/server/queries/audit-events.ts` |
| Audit integrity | Audit event hashes use SHA-256 and optional signing where configured. | `src/server/security/audit-chain.ts` |
| Sensitive configuration management | Administrative provider configuration is intended to remain server-side and outside browser-delivered bundles. | `src/lib/supabase/admin.ts`, `scripts/security/check-public-secrets.mjs`, `scripts/security/check-production-secret-readiness.mjs` |
| Encryption in transit | The product is designed to use HTTPS/TLS through managed hosting and provider API communication. | `docs/trust/ENCRYPTION.md`, deployment/provider evidence required |
| Backups and recovery | Backup and restore posture depends on managed provider configuration and restore-test evidence. | `docs/trust/BACKUP_AND_RECOVERY.md` |
| Subprocessors | Infrastructure and operational providers are listed for review before enterprise disclosure. | `docs/trust/SUBPROCESSORS.md` |
| Release gates | Security scripts cover RLS, API guards, auth, authorization, logs, headers, upload, billing, trust docs, and release evidence. | `package.json`, `scripts/security/*` |

## Evidence status labels

Use these labels in procurement answers:

- `implemented`: code or configuration is present in the repository and can be reviewed.
- `evidence_pending`: implementation exists, but target-environment runtime evidence is not attached.
- `designed_to_support`: the architecture is designed for the control, but production evidence or final policy approval is needed.
- `planned`: not available yet and must not be sold as current functionality.

## Explicit non-claims

RISCK COMPLY is not currently ISO 27001 certified. RISCK COMPLY does not currently have a SOC 2 Type I or Type II report. A third-party penetration test has not completed. Audit events include hash-chain integrity controls, but the product must not be described as WORM-backed or externally immutable unless separate storage and evidence exist. Formal backup restore and disaster recovery exercises have not yet been completed.

## Customer-safe language

Use: "RISCK COMPLY is designed to support enterprise security review with authenticated workspaces, organization-scoped RBAC, Supabase RLS migrations, audit events, managed-provider safeguards, and release evidence gates. Current certifications and external assurance artifacts are disclosed separately."

Do not use: "SOC 2 compliant", "ISO 27001 certified", "pentested", "end-to-end encrypted", "GDPR compliant", "immutable audit log", or "24/7 monitored" unless corresponding approved evidence is attached.

## Responsible disclosure

Security reports should currently be sent privately to `comercial@risckcomply.com`. This is the reachable corporate intake path while a dedicated security alias is being re-verified for external delivery. Do not advertise a dedicated security mailbox as active until that verification succeeds.

Public incident communication is available through the verified status authority at `https://risckcomplystatus1.statuspage.io/`.
