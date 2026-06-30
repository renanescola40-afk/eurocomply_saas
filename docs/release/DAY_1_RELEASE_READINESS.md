# Day 1 Release Readiness — Early Access / Controlled Beta

Date: 2026-06-30
Repository: `renanescola40-afk/eurocomply_saas`
Release target: Early Access / Controlled Beta
Scope: Stability and minimum safe-publication controls only. This report does not certify the product as enterprise-ready.

## Status

**GO for Controlled Beta only if the exact release commit passes CI, build, security checks, and production smoke before promotion.**

**NO-GO for enterprise-ready, procurement-ready, or 100% compliance claims.** Runtime evidence, external security review/pentest evidence, branch protection proof, deployment smoke, and final production sign-off are still required before those claims.

## Executive release decision

The codebase appears to have many release/security gates already wired, including package-lock alignment checks, public secret checks, API guard checks, no-store checks, protected route checks, release smoke scripts, rollback dry-run scripts, and P0 evidence checks.

For tomorrow's controlled beta, the safest release posture is:

1. Publish only as **Early Access / Controlled Beta**.
2. Keep enterprise claims, legal guarantee claims, automated certification claims, and production-enterprise readiness claims out of marketing copy.
3. Require authentication for dashboard/billing/private workflows.
4. Keep incomplete or unvalidated workflows behind beta/coming-soon messaging where applicable.
5. Promote only the exact commit that passes final validation.

## Problems found

### P0 / launch blockers before promotion

- Final validation from the exact release commit has not been observed in this audit environment.
- The audit environment could not run local `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, or `npm run build` because repository checkout was not available through the local shell. GitHub connector review and existing workflow status were used instead.
- Vercel deployment smoke must still be run against the final production URL.
- `/api/ready` is intentionally protected by `HEALTHCHECK_TOKEN`; the smoke command must include the token in production.
- The app currently contains Clerk-based auth/middleware paths while the product context says Supabase Auth. Do not attempt a full auth-provider migration before tomorrow. Treat this as a controlled-beta risk and verify the deployed auth provider/environment variables match the code that is actually deployed.

### High risks for tomorrow

- Multiple open PRs exist around readiness/billing/test gates. Avoid promoting a commit with partially applied readiness patches.
- Runtime evidence must not be faked. If live RLS, Stripe, health, ready, and protected-route smoke are not complete on the promoted deployment, ship as private/internal beta only.
- Stripe checkout must remain server-side: the client may choose a plan id, but the server must map plan to price id and enforce auth, organization, permission, step-up, trusted origin, and rate limit controls.

### Medium risks

- The codebase has many security scripts and evidence gates. This is good, but it can create false confidence if artifacts are stale. Release decision must be tied to the promoted commit SHA.
- Public repo visibility increases pressure on secret scanning. Keep service role keys, Stripe secrets, Supabase secrets, Sentry auth token, Redis token, and healthcheck token only in provider environment variables.

## Corrections made in this release branch

### Stripe Checkout hardening

Updated `src/app/api/billing/checkout/route.ts` to make the controlled beta safer for European B2B billing:

- Preserves selected plan on checkout cancellation by returning to `/${locale}/checkout?plan=${plan}&checkout=cancelled`.
- Passes normalized Stripe Checkout `locale`.
- Requires billing address collection.
- Enables Stripe customer address/name update.
- Enables tax ID collection.
- Forces payment method collection.
- Keeps server-side price mapping, organization metadata, audit logging, RBAC, step-up, trusted mutation guard, and no-store response behavior intact.

No new dependencies were introduced.

## Checks reviewed

### Build and dependency posture

- `package.json` defines `npm ci` compatible npm/package metadata and release/security scripts.
- `package-lock.json` root package dependency section is aligned with the visible `package.json` dependency declarations.
- No dependency upgrades were made.
- No new package was added.
- Clerk was not added. It already exists in the current codebase and remains a release risk to verify against the intended Supabase Auth architecture.

Required final commands on the release commit:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:package-lock
npm run security:public-secrets
npm run security:no-store
npm run security:protected-routes
npm run security:api-guards
npm run security:origin-guards
npm run release:deployment-smoke
```

### Critical routes

Routes to manually smoke in production after deployment:

- `/{locale}` landing page loads publicly.
- `/{locale}/pricing` loads publicly.
- `/{locale}/trust` loads publicly.
- `/{locale}/login` and `/{locale}/signup` load publicly.
- Authenticated users are sent to `/{locale}/onboarding` first.
- Dashboard routes redirect unauthenticated users to login with a safe `next` path.
- Private responses and redirects keep no-store cache semantics where implemented.

### Security minimum

Reviewed controls present in the current codebase:

- `/api/health` returns a minimal no-store health response.
- `/api/ready` requires a healthcheck bearer token and does not expose secret values.
- Billing checkout requires authenticated user, organization, permission, trusted mutation, rate limiting, step-up, and no-store output.
- Stripe webhook signature validation exists in the billing/Stripe route family and must remain required.
- Server-side Supabase admin/service-role usage must remain server-only.

### Supabase / tenant isolation

Required before promoting beyond private beta:

- Confirm live Supabase RLS evidence belongs to the production Supabase project, not a local/staging placeholder.
- Confirm private queries always scope by `organization_id` or by membership-derived current organization.
- Confirm no browser/client bundle imports `SUPABASE_SERVICE_ROLE_KEY` or server admin client.
- Confirm onboarding creates/uses a real organization and does not allow cross-tenant reads.

### Stripe

Current release branch checkout posture:

- Server validates the user.
- Server resolves current organization.
- Server requires `manage_billing` permission.
- Server validates trusted mutation/origin and rate limit.
- Server validates step-up for billing management.
- Server normalizes plan and maps plan to price id server-side.
- Server attaches organization/user metadata.
- Server writes audit log after session creation.
- Server does not return secrets.

Required runtime validation:

- Confirm all Stripe price IDs exist in the target Stripe account.
- Confirm webhook endpoint uses the correct production `STRIPE_WEBHOOK_SECRET`.
- Confirm test mode vs live mode is intentional for controlled beta.
- Confirm customer portal settings if portal is enabled.

### Observability

- Sentry/observability should not block build when DSN is missing unless enterprise release target requires it.
- Public errors must stay sanitized.
- Logs must not include bearer tokens, Stripe secrets, service role keys, or raw webhook secrets.

## Commands executed / attempted during this audit

Executed via GitHub connector:

- Located repository `renanescola40-afk/eurocomply_saas`.
- Reviewed `package.json`.
- Reviewed `package-lock.json` root dependency section.
- Reviewed `src/middleware.ts`.
- Reviewed `/api/health` and `/api/ready` route implementations.
- Reviewed `src/server/security/no-store.ts`.
- Reviewed `src/app/api/billing/checkout/route.ts`.
- Reviewed open PR readiness state for recent billing/readiness PRs.
- Created branch `release/day-1-controlled-beta-readiness`.
- Updated Stripe Checkout hardening.
- Created this release readiness report.

Attempted locally:

```bash
git clone --depth 1 https://github.com/renanescola40-afk/eurocomply_saas.git /mnt/data/eurocomply_saas
```

Result: local shell could not resolve `github.com`; therefore local `npm ci`, lint, typecheck, test, and build were not executed from this environment.

## Required final pre-launch checklist

Run this on the exact commit that will be deployed:

```bash
set -euo pipefail
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
npm run release:deployment-smoke
```

Then manually verify:

- Production landing, pricing, trust, login, signup load.
- Dashboard private route redirects unauthenticated users.
- Login/signup/onboarding flow completes for a beta test account.
- Checkout session can be created only by an authenticated organization member with billing permission.
- Checkout cancellation returns to selected checkout plan.
- Stripe webhook rejects missing/invalid signatures.
- No production secret appears in browser source, logs, GitHub, or public docs.

## Remaining risks

- Auth provider architecture is not cleanly aligned with the stated Supabase-only context because Clerk integration exists in current source. Do not start an auth migration before tomorrow; verify deployment env and document this as a beta limitation.
- Exact release commit still needs CI/build/security/smoke proof.
- External security review/pentest evidence is not complete.
- Branch protection and rollback evidence must be attached before enterprise/procurement claims.
- Some evidence files may be stale unless regenerated from the promoted commit.
- Vercel deployment rate limits or pending checks can block final promotion.

## Next steps after launch

### Within 24 hours

- Monitor auth failures, onboarding failures, checkout failures, 5xx rate, and Supabase RLS/permission errors.
- Keep beta cohort small and manually approved.
- Disable or hide any route that produces repeated 5xx or exposes incomplete data.
- Capture screenshots/logs from final production smoke.

### This week

- Decide whether the product is Supabase Auth or Clerk Auth. Remove the unused provider and simplify tenant identity mapping.
- Run live Supabase tenant isolation tests against the exact production project.
- Complete rollback dry-run proof.
- Complete external security review plan or lightweight pre-pentest review.
- Convert this report into a signed release decision with commit SHA, deployment URL, and owner approval.

### Before enterprise sales claims

- Complete external review/pentest evidence.
- Complete enterprise runtime evidence.
- Complete branch protection proof.
- Complete incident response/rollback drill.
- Complete legal review of EU AI Act/compliance claims.
