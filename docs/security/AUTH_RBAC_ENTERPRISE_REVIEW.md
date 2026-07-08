# Auth, RBAC and Tenant Isolation Enterprise Review

**Date:** 2026-07-08  
**Decision:** Supabase Auth is the single primary identity stack for the active application.  
**Status:** Code path corrected; enterprise production remains **No-Go** until CI/runtime validation passes in the target environment.

## Executive summary

Risck Comply had an identity-risk pattern where Supabase Auth was already used in the critical runtime path, while legacy Clerk artifacts still existed in dependencies, docs, helpers and retired routes. That creates operator confusion and can lead to split sessions, inconsistent RBAC, tenant lookup drift and RLS assumptions that do not match production behavior.

This review standardizes the active identity path on Supabase Auth because the application already relies on Supabase session cookies, `supabase.auth.getUser()`, Postgres tenant tables and Supabase RLS. Keeping Supabase as the source of truth avoids a second identity mapping layer before enterprise launch.

## Chosen stack

### Primary authentication provider

**Supabase Auth**

### Why

- Middleware already validates Supabase sessions server-side.
- The client auth hook already performs Supabase email/password, signup, OAuth and sign-out.
- Server queries already resolve the current user through Supabase Auth.
- Tenant isolation and RBAC naturally map to `organization_members.user_id`.
- Supabase RLS can use the authenticated Supabase user UUID without a translation layer.
- Removing a competing identity provider reduces login loop, stale membership and cross-tenant risk.

## Active identity architecture

| Layer | Source of truth | Notes |
| --- | --- | --- |
| Browser session | Supabase Auth client | Used only for UX state, not authorization authority. |
| Middleware | Supabase `getUser()` via `@supabase/ssr` | Private routes redirect anonymous users to localized login with safe `next`. |
| Server user | `src/server/queries/auth.ts` | Returns Supabase user UUID only. |
| Organization membership | `organization_members.user_id` | Active RBAC no longer falls back to alternate identity columns. |
| API authorization | `src/server/security/api-guards.ts` + `src/server/security/rbac.ts` | Validates user, organization, membership, permission and resource tenant. |
| Database isolation | Supabase/Postgres RLS | RLS must remain enabled for tenant-scoped tables. |

## Required flow validation

| Requirement | Implementation evidence | Status |
| --- | --- | --- |
| Anonymous private route redirects to login | `src/middleware.ts` localized redirect with `next` | Implemented |
| Safe `next` handling | login, signup and OAuth callback reject external/ protocol-relative URLs | Implemented |
| Login/signup success lands on onboarding | `AUTH_SUCCESS_PATH = '/onboarding'`, Supabase auth hook redirect | Implemented |
| Onboarding validates server session | `src/app/[locale]/onboarding/page.tsx` calls `getCurrentUser()` | Implemented |
| No organization shows creation flow | `getOnboardingActivationState()` returns null organization state | Implemented |
| Organization creates owner membership | `src/server/actions/organizations.ts` writes `organization_members.user_id` with `role: 'owner'` | Implemented |
| Existing completed organization redirects to dashboard | onboarding page checks `isOnboardingCompleted` | Implemented |
| Dashboard validates server session/membership | organization dashboard layout/query guard | Implemented |
| APIs validate user/org/RBAC server-side | `api-guards.ts` and `rbac.ts` | Implemented |
| Cross-tenant resource IDs rejected | `assertApiResourceOrganization()` | Implemented |

## Security controls

### Server-side authentication

Private pages and APIs must never trust browser state as an authorization source. The active code path resolves identity with Supabase server-side helpers and uses the Supabase user UUID for downstream checks.

### RBAC

RBAC is enforced through server helpers and permission matrices. Role checks must happen before billing, team, GDPR deletion, audit export and security-setting mutations.

### Tenant isolation

Tenant-scoped resources must be filtered and validated by `organization_id`. Client-supplied `organization_id` is untrusted until the server verifies membership.

### RLS

RLS remains a required database control. Service-role usage is allowed only inside trusted server code paths and must not be exposed to the browser.

### no-store

Private pages, sensitive APIs and auth callbacks use no-store behavior to avoid browser/proxy caching of tenant or session-sensitive responses.

### Logs and errors

API guard failures return sanitized errors and include a `requestId` for incident correlation. Logs must avoid tokens, secrets, raw request bodies and tenant data dumps.

### Rate limiting

The app has distributed rate-limit helpers for sensitive server mutations and organization creation. Supabase-hosted login/signup/password-reset rate limits must also be configured in Supabase Auth before enterprise production.

### Step-up / MFA

Enterprise step-up is required for these high-risk actions:

- `manage_billing`
- `manage_team`
- `gdpr_delete`
- `audit_chain_export`
- `change_security_settings`

Runtime provider proof is required before enterprise Go.

## Removed or retired conflict surface

The active runtime no longer uses competing identity imports, server queries or RBAC fallback logic. Legacy provider-specific helper files, docs and retired routes are removed from the active source tree. Historical migrations may still include legacy columns because migration history must not be rewritten casually; those columns are not the active identity source.

## Validation checklist

Required before production enterprise promotion:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run security:auth-tokens
npm run security:authorization-bola
npm run security:protected-routes
npm run security:step-up
npm run security:ci
npm run release:enterprise-readiness
```

## Known remaining risks

1. Runtime validation was not executed in this GitHub patch session.
2. Supabase Auth project settings must be verified in the real production project: Site URL, redirect allowlist, OAuth provider status, email confirmation policy and hosted auth rate limits.
3. RLS must be validated against the target Supabase project after migrations are applied.
4. Enterprise step-up/MFA requires provider proof before enterprise production.
5. Package lock should be regenerated with `npm run supply-chain:lockfile` after dependency removal so the lockfile is clean, not only active-dependency aligned.

## Go/No-Go

**No-Go for enterprise production until CI and runtime gates pass.**

The code path is corrected toward a single Supabase Auth architecture, but enterprise production approval requires passing the validation commands above with real environment configuration and updated runtime evidence.
