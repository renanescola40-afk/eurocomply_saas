# EuroComply OWASP ASVS Security Matrix

This matrix is the working control map for EuroComply security assurance. Target baseline:

- Application-wide: OWASP ASVS Level 2
- High-risk areas: OWASP ASVS Level 3 for authentication, authorization, tenant isolation, evidence exports, audit logging and administrative operations

## Scope

| Area | Scope |
| --- | --- |
| Identity | Google OAuth, Supabase sessions, protected routes, organization membership |
| Authorization | RBAC, organization context, plan entitlements, export permissions |
| Multi-tenancy | Supabase RLS, organization_id isolation, storage path isolation |
| Data lifecycle | Retention, GDPR export/delete, document storage, audit evidence pack |
| Operations | Vercel build/deploy, GitHub CI, secrets, observability, Sentry |
| Procurement evidence | Evidence Pack, Security Questionnaire, Vendor Assurance, Enterprise Readiness exports |

## Control Matrix

| ASVS Area | Requirement intent | EuroComply control | Evidence | Status |
| --- | --- | --- | --- | --- |
| V1 Architecture | Security architecture is explicit and reviewed | Enterprise Readiness Center, security docs, production checklist | `docs/PRODUCTION_LAUNCH_CHECKLIST.md`, `/enterprise-readiness` | Implemented / expanding |
| V2 Authentication | Authenticated access is enforced for sensitive routes | Supabase SSR session checks in proxy, protected route segments | `proxy.ts` | Implemented |
| V2 Authentication | OAuth flow resists CSRF/code interception | Google OAuth route uses Supabase SSR/PKCE callback flow | `src/app/auth/google/route.ts`, `src/app/auth/callback/route.ts` | Implemented / requires live config review |
| V3 Session Management | Sessions are not exposed to client JavaScript unnecessarily | Supabase SSR cookies used for server routes | Supabase SSR integration | Implemented / verify cookie flags in live env |
| V4 Access Control | Server-side authorization protects every sensitive operation | RBAC helper and permission checks for exports, billing, AI governance and team actions | `src/server/security/rbac.ts` | Implemented / expand coverage tests |
| V4 Access Control | Multi-tenant resources cannot be accessed across organizations | Organization context + RLS policies + storage policies | Supabase migrations, `scripts/security/check-rls.mjs` | Implemented / CI gate added |
| V5 Validation | User input is validated and normalized | Zod/query-level validation in API modules; upload constraints | API route modules | Partial / continue endpoint-by-endpoint review |
| V7 Error Handling | Errors do not leak secrets or internals | Guard responses and generic export failures | `src/server/security/guards.ts`, export APIs | Implemented / verify logs |
| V8 Data Protection | Sensitive exports are protected and traceable | Evidence Pack, Security Questionnaire, Vendor Assurance, Enterprise Readiness, Retention exports require RBAC + Business+ | `/api/*/export` routes | Implemented |
| V8 Data Protection | Export integrity is verifiable | SHA-256 hash + optional HMAC signature | `src/server/security/evidence-pack-integrity.ts` | Implemented |
| V9 Communications | HTTPS and strong browser security headers are enforced | CSP, HSTS, frame protections, permissions policy | `proxy.ts`, `next.config.ts` | Implemented / CSP tightening pending |
| V10 Malicious Code | Dependency risk is continuously monitored | Dependabot/CI/security gates | `.github/dependabot.yml`, CI workflow | Partial / add CodeQL/OSV if not enabled |
| V11 Business Logic | Plan and role restrictions are enforced server-side | Entitlement checks and RBAC guards | `src/server/billing/entitlements.ts`, RBAC helpers | Implemented / expand tests |
| V12 Files | Uploaded documents are private and tenant-scoped | Controlled documents bucket and storage policies | Supabase migration, documents APIs | Implemented / malware scanning pending |
| V14 Configuration | Production readiness is automatically checked | Preflight + enterprise readiness API + RLS security gate | `scripts/preflight.mjs`, `src/app/api/ops/enterprise-readiness/route.ts` | Implemented |

## Critical Attack Scenarios To Test Before Enterprise Launch

1. User from Organization A attempts to read Organization B documents, vendors, risks, AI systems and incidents.
2. Viewer attempts to export Evidence Pack, Security Questionnaire and Vendor Assurance reports.
3. Member attempts to access billing portal or invite an admin.
4. Removed user reuses an old session to access APIs.
5. Public/anonymous user calls every `/api/*/export` endpoint.
6. Upload attempts with executable/polyglot files.
7. OAuth callback replay/state mismatch attempt.
8. Preview deployment uses production secrets or production Supabase project.
9. Service role key is accidentally exposed in client bundle or logs.
10. RLS policy regression in a new migration.

## Required Security Evidence For Enterprise Reviews

| Evidence | Location |
| --- | --- |
| Security overview | `docs/SECURITY_OVERVIEW.md` |
| Incident response | `docs/INCIDENT_RESPONSE.md` |
| Backup and continuity | `docs/BACKUP_AND_CONTINUITY.md` |
| Legal readiness | `docs/LEGAL_READINESS.md` |
| Production checklist | `docs/PRODUCTION_LAUNCH_CHECKLIST.md` |
| Evidence Pack export | `/audit-pack` |
| Evidence Pack verifier | `/audit-pack/verify` |
| Enterprise Readiness export | `/enterprise-readiness` |
| Security Questionnaire export | `/security-questionnaire` |
| Vendor Assurance export | `/vendor-assurance` |
| Retention Policy export | `/retention-center` |

## Open Hardening Backlog

- Add tenant-isolation integration tests against a seeded Supabase test project.
- Add CodeQL workflow and dependency review gate.
- Add SSO/SAML/OIDC per organization.
- Add step-up authentication for exports, billing, role changes and GDPR delete.
- Add malware scanning for controlled document uploads.
- Add audit-log hash chaining for tamper evidence.
- Tighten CSP by reducing `unsafe-inline` with nonce/hash-based scripts where feasible.
- Add anomaly detection for export spikes, repeated 403s and high-risk role changes.
