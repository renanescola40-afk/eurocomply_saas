# Auth, RBAC and Tenant Isolation Enterprise Review

**Decision:** Supabase Auth is the single primary identity stack for the active application.  
**Status:** Core Auth/RBAC has a protected exact-SHA runtime proof. Enterprise production remains **No-Go** until every canonical identity control and the remaining production gates have real passing evidence.

## Executive summary

RISCK COMPLY standardizes the active identity path on Supabase Auth. Browser state is not an authorization authority: server-side Supabase identity, `organization_members.user_id`, permission checks and Postgres RLS remain the security boundary.

The protected `Auth RBAC Tenant Proof` now separates two evidence domains:

1. **Core Auth/RBAC proof** — password login, session refresh/revocation, expected roles, same-tenant access, cross-tenant read/mutation denial and same-run cleanup.
2. **Disposable identity journey** — real public Supabase signup followed by atomic organization creation and onboarding activation for a synthetic no-organization user, followed by verified same-run cleanup.

A failed disposable signup/onboarding journey cannot erase an already-valid core RBAC proof. Conversely, the scorecard cannot promote signup or onboarding from static inspection or from the core proof alone.

## Chosen stack

### Primary authentication provider

**Supabase Auth**

### Why

- Middleware validates Supabase sessions server-side.
- The client auth hook performs Supabase email/password, signup, OAuth and sign-out.
- Server queries resolve the current user through Supabase Auth.
- Tenant isolation and RBAC map directly to `organization_members.user_id`.
- Supabase RLS can use the authenticated Supabase user UUID without a second identity mapping layer.
- A single identity source reduces login-loop, stale-membership and cross-tenant drift risk.

## Active identity architecture

| Layer | Source of truth | Notes |
| --- | --- | --- |
| Browser session | Supabase Auth client | UX state only; never the authorization authority. |
| Middleware | Supabase `getUser()` via `@supabase/ssr` | Private routes redirect anonymous users to localized login with safe `next`. |
| Server user | `src/server/queries/auth.ts` | Returns Supabase user UUID only. |
| Organization membership | `organization_members.user_id` | Active RBAC has no alternate identity fallback. |
| API authorization | `src/server/security/api-guards.ts` + `src/server/security/rbac.ts` | Validates user, organization, membership, permission and resource tenant. |
| Database isolation | Supabase/Postgres RLS | Required for tenant-scoped tables. |

## Required flow validation

| Requirement | Implementation / evidence | Status |
| --- | --- | --- |
| Anonymous private route redirects to login | `src/middleware.ts` localized redirect with `next` | Implemented |
| Safe `next` handling | login, signup and OAuth callback reject external/protocol-relative URLs | Implemented |
| Password login works | protected disposable Auth/RBAC runtime proof | Runtime provable |
| Session refresh and logout/revocation work | protected disposable Auth/RBAC runtime proof | Runtime provable |
| Owner/member RBAC works | protected disposable Auth/RBAC runtime proof | Runtime provable |
| Cross-tenant read and mutation isolation works | protected disposable Auth/RBAC runtime proof | Runtime provable |
| Public signup works | `auth.signUp` in bounded disposable identity journey | Runtime provable after protected run |
| New user starts without organization scope | disposable identity journey queries membership before creation | Runtime provable after protected run |
| Organization creates owner membership atomically | `create_organization_with_owner_atomic` | Runtime provable after protected run |
| Onboarding activation completes atomically | `complete_onboarding_activation_atomic` | Runtime provable after protected run |
| Signup/onboarding fixtures are removed | exact-ID/user cleanup plus absence verification | Required for promotion |
| Google OAuth callback round trip works | real provider callback journey | **NOT_VERIFIED** until executed |

## Protected runtime evidence boundary

Canonical source evidence:

`docs/security/evidence/runtime/auth-rbac-final-validation.json`

Canonical scorecard evidence:

`docs/security/evidence/runtime/auth-rbac-validation.json`

Protected workflow:

`.github/workflows/auth-rbac-runtime-proof.yml`

The workflow is exact-current-main bound and runs in the protected `production` environment. It uses the Supabase URL, anon key and service-role credential only at runtime. Credentials, passwords, access tokens, user UUIDs, organization UUIDs and raw provider responses are not written to retained evidence.

### Core proof

The core `checks` object remains authoritative for the existing Auth/RBAC proof. Every core check and cleanup check must pass before the source evidence can be `Complete/passed`.

### Signup/onboarding journey

`identityJourney` is independently bounded. A scorecard promotion requires:

- real `auth.signUp` success;
- signup session termination where a session is issued;
- a user initially without organization membership;
- atomic organization + owner membership creation;
- atomic onboarding activation;
- persisted completed onboarding state observation;
- deletion of activation run, AI system, membership, organization and disposable auth user where created;
- post-cleanup absence verification;
- zero retained credentials, tokens, user IDs, organization IDs or raw provider responses.

The journey deliberately creates no invitation emails, recommended documents or suggested tasks. It uses a synthetic trial organization and a single synthetic AI system to minimize bounded production fixture surface.

### OAuth callback

`oauthCallback` stays `NOT_VERIFIED` even when Supabase Google provider configuration is valid. Configuration proof is not equivalent to a successful browser/provider callback round trip. Only real callback evidence may promote this control.

## Security controls

### Server-side authentication

Private pages and APIs resolve identity with Supabase server-side helpers and use the Supabase user UUID for downstream authorization.

### RBAC and tenant isolation

RBAC is enforced through server permission helpers. Tenant-scoped resources are filtered and validated by `organization_id`; client-supplied tenant identifiers remain untrusted until membership is verified.

### RLS

RLS remains a required database control. Service-role usage is restricted to trusted server or protected proof code and must never be exposed to the browser.

### no-store, logs and errors

Private routes and sensitive APIs use no-store behavior. API failures are sanitized and request-correlated. Logs and retained evidence must not contain tokens, secrets, disposable credentials or tenant data dumps.

### Step-up / MFA

Enterprise step-up remains required for high-risk actions including billing, team administration, GDPR deletion, audit-chain export and security-setting changes. Step-Up has its own protected runtime evidence boundary and is not implied by the Auth/RBAC proof.

## Validation checklist

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

Protected runtime promotion additionally requires the exact-current-main `Auth RBAC Tenant Proof` artifact to pass its source and scorecard validators.

## Known remaining risks / external evidence

1. A successful Google OAuth provider callback round trip still requires real provider/browser runtime evidence.
2. Enterprise Step-Up/MFA has a separate production provider/runtime gate.
3. Production provider proofs and branch-governance controls remain independent release gates; identity evidence cannot substitute for them.
4. External security/legal evidence remains external and must never be synthesized from code tests.

## Go/No-Go

**No-Go for Enterprise 100 until every canonical runtime and external gate passes.**

A successful disposable signup/onboarding journey may close the `signup` and `organizationOnboarding` scorecard controls. It must not promote `oauthCallback`, Step-Up, provider governance, Stripe runtime evidence, branch governance, pentest or legal review.
