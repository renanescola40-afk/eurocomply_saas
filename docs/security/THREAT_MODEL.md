# EuroComply Threat Model

This document defines the baseline threat model for EuroComply as a multi-tenant B2B compliance SaaS.

## Security objectives

1. Keep tenant data isolated by organization.
2. Prevent unauthorized access to documents, audit evidence, exports, billing and team management.
3. Keep service-role and provider credentials server-side only.
4. Prevent public or client-side exposure of sensitive files and operational metadata.
5. Preserve audit evidence for critical actions.
6. Keep production deployments gated by security checks, approval and rollback readiness.

## Primary assets

| Asset | Risk |
| --- | --- |
| User sessions | Account takeover, stale sessions, session replay |
| Organization records | Cross-tenant access, unauthorized role changes |
| Controlled documents | Sensitive evidence exposure, unsafe uploads |
| Audit events and export evidence | Tampering, unauthorized export, cache leakage |
| Billing data | Unauthorized plan or billing portal access |
| Supabase service-role credentials | Full backend data access if exposed |
| Vercel and GitHub deployment credentials | Unauthorized production deploys |

## Trust boundaries

| Boundary | Expected control |
| --- | --- |
| Browser to Next.js API | Auth, trusted-origin guard, schema validation, rate limiting |
| Next.js API to Supabase | Server-side org/RBAC checks and RLS-backed storage/database policies |
| Next.js API to Stripe | Provider signature checks for webhooks and RBAC for billing actions |
| GitHub Actions to Vercel/Supabase | Environment-scoped secrets, preflight, security CI and protected deployments |
| File upload to storage | Type allowlist, signature validation, quota, tenant pathing, private bucket |

## High-priority threats

| Threat | Example | Required mitigation |
| --- | --- | --- |
| BOLA / IDOR | User supplies another organization or resource id | Server resolves organization from authenticated user and verifies membership before every resource action |
| Role escalation | Viewer/admin role changed by non-admin | Central RBAC matrix plus API guard checks for team and settings routes |
| Cross-site mutation | Third-party site triggers POST from signed-in browser | Trusted Origin/Referer validation on mutating routes |
| Sensitive response caching | Export cached by browser/CDN | `noStoreJson()` / `noStoreDownload()` for sensitive API responses |
| Credential exposure | Service-role key imported into client bundle | Client-boundary and public-secret scanners |
| Unsafe upload | Malicious file stored as evidence | File signature validation and enterprise malware-scan fail-closed policy |
| Audit tampering | Critical audit event removed or reordered | Audit-chain migrations, append RPC and verification endpoint |
| Supply-chain compromise | Malicious package or GitHub Action change | Dependency Review, CodeQL, pinned package manager, lockfile/audit triage |
| Unreviewed production change | Sensitive change merged without owner review | CODEOWNERS, PR checklist and required branch protection |

## Abuse cases to test before enterprise release

1. User from Organization A attempts to read or mutate Organization B resources.
2. Viewer attempts to export evidence packs, security questionnaires or audit logs.
3. Member attempts to manage billing or team invitations.
4. Removed user attempts to reuse an old session.
5. Anonymous caller invokes every non-public API route.
6. Cross-site POST attempts target billing, GDPR delete, upload and team management.
7. Upload attempts use mismatched MIME type and file signature.
8. Sensitive export response is cached by browser, Vercel edge or a proxy.
9. Service-role key or server-only variable appears in client bundle.
10. GitHub workflow or dependency update bypasses security review.

## Release rule

A public or enterprise release must not be approved unless:

- `npm run security:ci` passes;
- branch protection requires pull request review and Code Owner review;
- production GitHub Environment requires approval;
- Supabase migrations and RLS/storage policies are applied;
- supply-chain evidence is attached or explicitly accepted as a documented risk;
- rollback, incident response and customer communication owners are assigned.

## Open risks

- `package-lock.json` is still required for deterministic dependency resolution.
- A real MFA or identity-provider reauthentication provider is still required for complete step-up enforcement.
- A real malware scanning provider is still required for enterprise fail-closed upload scanning.
- External penetration testing evidence is still required before claiming externally validated readiness.
