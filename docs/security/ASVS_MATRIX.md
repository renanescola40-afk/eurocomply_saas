# EuroComply OWASP ASVS Security Matrix

This matrix is the working control map for EuroComply security assurance. Target baseline:

- Application-wide: OWASP ASVS Level 2
- High-risk areas: OWASP ASVS Level 3 for authentication, authorization, tenant isolation, evidence exports, audit logging, uploads, GDPR operations and administrative actions

## Scope

| Area | Scope |
| --- | --- |
| Identity | Google OAuth, Supabase sessions, protected routes, organization membership |
| Authorization | RBAC, organization context, plan entitlements, export permissions |
| Multi-tenancy | Supabase RLS, organization_id isolation, storage path isolation |
| Data lifecycle | Retention, GDPR export/delete, document storage, audit evidence pack |
| Operations | Vercel build/deploy, GitHub CI, secrets, observability, Sentry |
| Procurement evidence | Evidence Pack, Security Questionnaire, Vendor Assurance, Enterprise Readiness exports |
| Uploads | Controlled document upload, type allowlist, size limits, magic-byte validation, private storage |

## Control Matrix

| ASVS Area | Requirement intent | EuroComply control | Evidence | Status |
| --- | --- | --- | --- | --- |
| V1 Architecture | Security architecture is explicit and reviewed | Enterprise Readiness Center, security docs, production checklist | `docs/PRODUCTION_LAUNCH_CHECKLIST.md`, `/enterprise-readiness` | Implemented / expanding |
| V2 Authentication | Authenticated access is enforced for sensitive routes | Supabase SSR session checks in proxy, protected route segments | `proxy.ts`, `scripts/security/check-protected-routes.mjs` | Implemented + CI gate |
| V2 Authentication | OAuth flow resists CSRF/code interception | Google OAuth route uses Supabase SSR/PKCE callback flow | `src/app/auth/google/route.ts`, `src/app/auth/callback/route.ts` | Implemented / requires live config review |
| V3 Session Management | Sessions are not exposed to client JavaScript unnecessarily | Supabase SSR cookies used for server routes; client boundary scanner prevents server-only imports into client files | `src/server/security/*`, `scripts/security/check-client-boundaries.mjs` | Implemented + CI gate |
| V4 Access Control | Server-side authorization protects every sensitive operation | RBAC helper and permission checks for exports, billing, AI governance, documents and team actions | `src/server/security/rbac.ts`, `scripts/security/check-api-guards.mjs` | Implemented + CI gate |
| V4 Access Control | Denied authorization responses are not cacheable | `permissionDeniedResponse()` uses centralized no-store response helper | `src/server/security/rbac.ts`, `src/server/security/rbac.test.ts`, `scripts/security/check-security-responses.mjs` | Implemented + regression test |
| V4 Access Control | Multi-tenant resources cannot be accessed across organizations | Organization context + RLS policies + storage policies | Supabase migrations, `scripts/security/check-rls.mjs` | Implemented / CI gate added |
| V5 Validation | User input is validated and normalized | API validation, type normalization, upload allowlists and security checks | API route modules, upload route | Implemented / continue endpoint-by-endpoint review |
| V5 Validation | Cross-site mutating requests are rejected | Origin/Referer guard for mutating sensitive APIs, with allowlist via `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS` | `src/server/security/origin-guard.ts`, `scripts/security/check-origin-guards.mjs` | Implemented / advisory gate |
| V7 Error Handling | Errors do not leak secrets or internals | Generic error messages and centralized no-store response helpers | `src/server/security/no-store.ts`, `scripts/security/check-security-responses.mjs` | Implemented + CI gate |
| V8 Data Protection | Sensitive exports are protected and traceable | Evidence Pack, Security Questionnaire, Vendor Assurance, Enterprise Readiness, Retention and GDPR exports require auth/RBAC/plan gates | `/api/*/export` routes, GDPR APIs | Implemented |
| V8 Data Protection | Sensitive responses are not cached by browsers, CDN or proxies | `noStoreJson()` and `noStoreDownload()` used for sensitive API responses | `src/server/security/no-store.ts`, `scripts/security/check-no-store.mjs` | Implemented + CI gate |
| V8 Data Protection | Export integrity is verifiable | SHA-256 hash + optional HMAC signature | `src/server/security/evidence-pack-integrity.ts` | Implemented |
| V9 Communications | HTTPS and strong browser security headers are enforced | CSP, HSTS, frame protections, referrer policy, content sniffing protection and permissions policy | `proxy.ts`, `next.config.ts`, `scripts/security/check-security-headers.mjs` | Implemented + CI gate |
| V10 Malicious Code | Dependency risk is continuously monitored | Dependabot/CI/security gates | `.github/dependabot.yml`, CI workflow | Partial / add CodeQL/OSV if not enabled |
| V11 Business Logic | Plan and role restrictions are enforced server-side | Entitlement checks and RBAC guards | `src/server/billing/entitlements.ts`, `src/server/security/rbac.ts` | Implemented / expanding tests |
| V12 Files | Uploaded documents are private and tenant-scoped | Controlled documents bucket, organization-scoped storage path, private storage policies | Supabase migration, `src/app/api/documents/upload/route.ts` | Implemented |
| V12 Files | Uploaded documents are validated beyond client MIME type | Magic-byte validation for PDF, PNG, JPEG, DOCX and XLSX; upload rejection audit event | `src/server/security/file-signature.ts`, `src/server/security/file-signature.test.ts`, `scripts/security/check-upload-security.mjs` | Implemented + CI gate |
| V12 Files | Upload endpoint has layered protection | Origin guard, no-store responses, RBAC, quota, size limit, allowlist, checksum, private storage and audit event | `src/app/api/documents/upload/route.ts`, `scripts/security/check-upload-security.mjs` | Implemented + CI gate |
| V14 Configuration | Production readiness is automatically checked | Preflight + enterprise readiness API + RLS/security gates | `scripts/preflight.mjs`, `src/app/api/ops/enterprise-readiness/route.ts` | Implemented |
| V14 Configuration | Public secrets are not exposed through source or client envs | Public secret exposure scanner for source, docs, scripts, GitHub config and env examples | `scripts/security/check-public-secrets.mjs` | Implemented + CI gate |

## Security Gate Inventory

| Gate | Purpose | Command |
| --- | --- | --- |
| RLS gate | Checks Supabase RLS and policy presence for critical tables | `npm run security:rls` |
| API guard gate | Checks sensitive API routes for auth, RBAC, plan, rate-limit, audit and integrity guard tokens | `npm run security:api-guards` |
| Protected routes gate | Checks `proxy.ts` route protection and security header structure | `npm run security:protected-routes` |
| Public secrets gate | Detects risky `NEXT_PUBLIC_*` secrets and committed secret-like values | `npm run security:public-secrets` |
| Client boundary gate | Prevents server-only imports or server env usage in client components | `npm run security:client-boundaries` |
| Security headers gate | Prevents CSP/HSTS/frame/referrer/permissions header regressions | `npm run security:headers` |
| No-store gate | Checks sensitive API routes for no-store cache protection | `npm run security:no-store` |
| Origin guard gate | Scans mutating APIs for Origin/Referer guard coverage | `npm run security:origin-guards` |
| Upload security gate | Prevents regressions in document upload controls | `npm run security:upload` |
| Security response gate | Prevents regressions in no-store/RBAC/entitlement response helpers | `npm run security:responses` |
| Full security package | Runs all security gates, typecheck and tests | `npm run security:ci` |

## Critical Attack Scenarios To Test Before Enterprise Launch

1. User from Organization A attempts to read Organization B documents, vendors, risks, AI systems and incidents.
2. Viewer attempts to export Evidence Pack, Security Questionnaire and Vendor Assurance reports.
3. Member attempts to access billing portal or invite an admin.
4. Removed user reuses an old session to access APIs.
5. Public/anonymous user calls every `/api/*/export` endpoint.
6. Upload attempts with executable/polyglot files disguised as PDF, image, DOCX or XLSX.
7. Upload attempts with mismatched MIME type and file signature.
8. OAuth callback replay/state mismatch attempt.
9. Cross-site POST attempts against billing, AI governance, document upload and GDPR delete endpoints.
10. Preview deployment uses production secrets or production Supabase project.
11. Service role key is accidentally exposed in client bundle or logs.
12. RLS policy regression in a new migration.
13. Sensitive API response is cached by browser, CDN or proxy.
14. CSP regression introduces wildcard or production `unsafe-eval`.

## Required Security Evidence For Enterprise Reviews

| Evidence | Location |
| --- | --- |
| Security overview | `docs/SECURITY_OVERVIEW.md` |
| Incident response | `docs/INCIDENT_RESPONSE.md` |
| Backup and continuity | `docs/BACKUP_AND_CONTINUITY.md` |
| Legal readiness | `docs/LEGAL_READINESS.md` |
| Production checklist | `docs/PRODUCTION_LAUNCH_CHECKLIST.md` |
| ASVS control matrix | `docs/security/ASVS_MATRIX.md` |
| Security gates | `scripts/security/*.mjs` |
| Evidence Pack export | `/audit-pack` |
| Evidence Pack verifier | `/audit-pack/verify` |
| Enterprise Readiness export | `/enterprise-readiness` |
| Security Questionnaire export | `/security-questionnaire` |
| Vendor Assurance export | `/vendor-assurance` |
| Retention Policy export | `/retention-center` |
| GDPR export/delete controls | `src/app/api/gdpr/*/route.ts` |
| Upload controls | `src/app/api/documents/upload/route.ts`, `src/server/security/file-signature.ts` |

## Open Hardening Backlog

- Add tenant-isolation integration tests against a seeded Supabase test project.
- Add CodeQL workflow and dependency review gate.
- Add SSO/SAML/OIDC per organization.
- Add step-up authentication for exports, billing, role changes and GDPR delete.
- Add malware scanning for controlled document uploads.
- Add audit-log hash chaining for tamper evidence.
- Tighten CSP by reducing `unsafe-inline` with nonce/hash-based scripts where feasible.
- Add anomaly detection for export spikes, repeated 403s and high-risk role changes.
