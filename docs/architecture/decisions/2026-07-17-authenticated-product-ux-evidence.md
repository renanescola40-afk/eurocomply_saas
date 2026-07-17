# Authenticated product UX evidence without authentication bypass

- Status: Accepted
- Date: 2026-07-17
- Scope: onboarding wizard, organization dashboard and exact-SHA UX evidence

## Context

The enterprise scorecard already validated public landing, pricing, login and mobile surfaces through Playwright. The protected onboarding and organization dashboard controls remained unverified because CI intentionally has no production user session or service-role bypass.

Adding an authentication bypass, public fixture route, hard-coded test cookie or production-only test token would create a new security boundary merely to satisfy a UX score. Treating anonymous redirects as proof of authenticated UX would also be misleading.

## Decision

Protected UX acceptance combines three independent repository-backed signals:

1. **Real component interaction tests**
   - Render the actual `B2BOnboardingFlow` in `jsdom`.
   - Exercise required-field errors, slug derivation, draft persistence feedback, step progression, AI-system validation, plan selection, completion feedback and the explicit dashboard destination.
   - Render the actual `EnterpriseComplianceCommandCenter` with synthetic organization-scoped data.
   - Verify accessible region naming, metrics, localized links, absence of `/undefined`, and permission-dependent workspace and billing actions.

2. **Production-like route boundary tests**
   - Existing Playwright suites prove onboarding and dashboard routes redirect anonymous users to localized login.
   - The original destination is preserved in `next`.
   - The private redirect is `no-store`.

3. **Source contracts**
   - Protected pages remain force-dynamic and force-no-store.
   - The onboarding page uses the real activation query and server actions.
   - The dashboard page uses the real organization dashboard query and protected components.
   - The command center keeps permission-dependent actions and organization-scoped review language.

## Prohibited test mechanisms

This evidence must not introduce:

- an auth bypass environment variable;
- a public authenticated fixture route;
- a hard-coded session or cookie;
- a service-role token in browser tests;
- production customer data;
- a claim that Supabase, RLS or providers were exercised.

## Scorecard evidence

`build-public-ux-evidence.mjs` promotes `onboarding` and `dashboard` checks only when:

- real component acceptance tests and route-boundary tests are present;
- source contracts remain intact;
- the Full Security Suite passed;
- aggregate required checks passed;
- target and checked-out SHA match;
- execution has canonical GitHub Actions provenance.

The existing public UX controls remain in the same document so one exact-SHA artifact describes the complete product UX surface.

## Evidence boundary

This validates the real protected UX components with synthetic props and the production-like anonymous route boundary. It does not validate a live authenticated browser session, Supabase data, RLS, production providers, screen-reader software or production deployment behavior.

## Consequences

- PRD-04 and PRD-05 can be verified without weakening authentication.
- Component regressions, broken destinations and permission-state mistakes fail CI.
- Authentication, tenancy and runtime provider controls remain independently unverified until their dedicated evidence runs.

## Rollback

Revert the component tests, evidence-builder extension, evidence tests and this decision record. The onboarding and dashboard scorecard checks must then return to `NOT_VERIFIED`; public UX checks may remain only if their original evidence contract still passes.
