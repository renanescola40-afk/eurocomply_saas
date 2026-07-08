# Risck Comply

Risck Comply is a B2B SaaS platform for European organizations that need to operationalize AI compliance, EU AI Act readiness, AI system inventory, risk classification, evidence management, policy workflows, audit trails, billing, and multi-tenant organization operations.

> Risck Comply helps teams organize compliance work and evidence. It does not replace legal advice, regulatory counsel, certification, or a formal external audit.

---

## Product identity

- **Active product name:** Risck Comply
- **Repository name:** `eurocomply_saas` is a legacy technical repository name kept for continuity.
- **Category:** European AI compliance operations SaaS.
- **Primary audience:** SaaS founders, CTOs, compliance teams, security teams, legal operators, AI agencies, fintech, HR tech, and B2B vendors using or selling AI-enabled systems in Europe.
- **Positioning:** A practical operating system for AI governance evidence, not a legal guarantee.

Customer-facing copy should use **Risck Comply** consistently. Historical labels such as EuroComply may appear in legacy migrations, archived evidence, or repository history, but should not be introduced into new product surfaces.

Customer-facing copy must **not** be described as enterprise-ready unless the relevant checks pass and supporting runtime evidence is available.

---

## Current identity decision

**Supabase Auth is the single primary authentication stack for the active application.**

The product uses Supabase Auth for browser sessions, email/password, OAuth callback exchange, middleware session checks, server-side `getUser()` validation, and Postgres/RLS identity mapping. Organization membership and RBAC are resolved through Supabase/Postgres tables using the authenticated Supabase user UUID.

No second identity provider should be added to login, signup, middleware, server queries, RBAC, API guards, onboarding, billing, or dashboard access unless the full identity architecture is redesigned, migrated, and documented in one PR.

---

## Value proposition

Companies adopting AI often struggle with scattered tools, undocumented usage, unclear ownership, inconsistent risk assessment, and weak evidence trails. Risck Comply centralizes that operating model into one workspace:

- One source of truth for AI systems and usage.
- EU AI Act readiness workflows tied to operational evidence.
- Risk classification support for minimal, limited, high, and unacceptable risk patterns.
- Evidence packs, policies, and document records that teams can maintain.
- Organization-level access control for B2B customers.
- Billing and plan gating for commercial SaaS operations.
- Security checks and release gates built into the development workflow.

The goal is to help teams move from informal AI usage to documented, accountable, and reviewable AI governance.

---

## Technical stack

- **Framework:** Next.js App Router.
- **Language:** TypeScript.
- **Runtime/UI:** React.
- **Styling:** Tailwind CSS, Radix UI primitives, shadcn-style components, custom enterprise UI system.
- **Authentication:** Supabase Auth.
- **Database:** Supabase/Postgres.
- **Authorization:** Supabase Row Level Security and server-side permission guards.
- **Tenant model:** `organizations` plus `organization_members.user_id` mapped to the authenticated Supabase user UUID.
- **Payments:** Stripe.
- **Validation:** Zod.
- **Testing:** Vitest and Playwright.
- **Linting/type safety:** ESLint and TypeScript.
- **Observability hooks:** Sentry configuration is supported by environment variables when enabled.
- **Product analytics hooks:** PostHog EU configuration is supported by environment variables when enabled.

---

## Architecture summary

```text
Browser / Client UI
  -> Next.js App Router
  -> Supabase Auth client session
  -> Middleware/server queries validate Supabase user with getUser()
  -> Server actions/API routes validate user, organization membership and RBAC
  -> Supabase Postgres with tenant-aware tables and RLS
  -> Stripe checkout, customer, subscription, and webhook flows
  -> Audit/security evidence scripts and release gates
```

Core design principles:

- Keep tenant data scoped by organization/workspace identifiers.
- Never expose service-role credentials to the browser.
- Validate user identity and permissions on server-side operations.
- Treat UI state as display-only, never as an authorization source.
- Keep billing authority on the server and in Stripe webhooks.
- Use environment variables for provider configuration and secrets.
- Treat security/release scripts as part of the product, not optional polish.

---

## Auth and onboarding flow

1. Anonymous users who access private routes are redirected to localized login with a safe `next` value.
2. Login/signup success lands on localized onboarding.
3. Onboarding checks the current Supabase user server-side.
4. If the user has no organization, onboarding shows the organization creation flow.
5. Organization creation writes an owner membership for `organization_members.user_id`.
6. Completed onboarding redirects to localized organization dashboard.
7. Users with a completed organization are redirected from onboarding to dashboard.
8. Dashboard pages validate session and membership server-side.
9. Private APIs validate user, organization, membership, RBAC and resource tenant ownership server-side.
10. Sensitive responses use no-store headers and sanitized errors.

---

## Environment variables

Use `.env.example` as the canonical template. Copy it locally and fill only the values required for the environment being used.

```bash
cp .env.example .env.local
```

Common groups:

- Application URL and trusted origins.
- Supabase Auth URL, anon key, service role key, OAuth provider configuration and redirect allowlists.
- Stripe publishable key, secret key, webhook secret, and price IDs.
- Email provider keys.
- Security, health check, audit signing, cron, rate limiting, upload scanning, observability, analytics, step-up, and CI/CD provider values.

Never commit real secrets. Public `NEXT_PUBLIC_*` variables are visible to the browser and must never contain private keys.

---

## Run locally

Prerequisites:

- Node.js compatible with the project dependencies.
- npm, using the package manager declared in `package.json`.
- Supabase project or local Supabase environment.
- Stripe test account for billing flows.

Install dependencies:

```bash
npm ci
```

Prepare environment variables:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

The app starts on `http://localhost:3000`.

---

## Validation commands

Use the smallest relevant subset during development, then run the full gate before requesting review.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Security gates:

```bash
npm run security:auth-tokens
npm run security:authorization-bola
npm run security:protected-routes
npm run security:step-up
npm run security:ci
```

Production readiness gates:

```bash
npm run release:deployment-smoke
npm run release:rollback:dry-run
npm run release:readiness
npm run release:enterprise-readiness
```

These scripts are engineering controls and evidence checks. They are not a substitute for external legal review, third-party audit, or formal certification.

---

## Deployment

The project is designed to deploy to Vercel or another Next.js-compatible platform.

Recommended deployment flow:

1. Configure production environment variables in the deployment provider secret store.
2. Apply Supabase migrations in the target Supabase project.
3. Confirm RLS is enabled and policies are aligned with tenant isolation requirements.
4. Configure Supabase Auth production Site URL, redirect URLs and OAuth providers.
5. Configure Stripe live products, prices, and webhook endpoint.
6. Set the billing webhook endpoint to `/api/billing/webhook`.
7. Run local or CI readiness checks before promoting production.
8. Deploy from the protected production branch.
9. Verify auth, organization access, billing checkout, webhook handling, dashboard loading, step-up and audit logs after deploy.

Do not place production secrets in GitHub files, screenshots, issue comments, pull request descriptions, or public logs.

---

## Multi-tenant model

Risck Comply is structured around organizations/workspaces.

Tenant isolation principles:

- Each customer account is represented by an organization or workspace record.
- Members are linked through membership tables such as `organization_members` and/or `workspace_members` depending on the active module.
- Product data such as AI systems, assessments, documents, monitoring preferences, audit logs, subscriptions, and payments is scoped to the tenant identifier.
- Server-side queries resolve the current organization for the authenticated user.
- Role and permission checks protect sensitive actions such as billing management, team management, GDPR deletion, audit exports and security settings.
- Client-provided tenant IDs are treated as untrusted until validated against server-side membership.

---

## Supabase RLS model

Supabase/Postgres is used for application data and tenant-scoped records.

RLS principles:

- RLS should remain enabled for tenant-scoped tables.
- Policies should check authenticated membership before allowing reads/writes.
- `WITH CHECK` policies should prevent cross-tenant inserts or updates.
- Service-role usage must stay on the server and only in trusted code paths.
- Public clients should use anon keys and rely on RLS, not client-side filtering.
- RLS changes should be validated with the available security scripts before release.

---

## Security and compliance posture

Current engineering posture includes security-oriented scripts, release gates, and product controls. This README does not claim external certification or completed third-party assurance.

Implemented or supported engineering controls include:

- Secret scanning checks for public exposure.
- Production secret readiness checks.
- Supply-chain and package-lock alignment checks.
- npm audit gates.
- API guard checks.
- Route protection checks.
- Security header checks.
- No-store/cache safety checks.
- Origin and open-proxy checks.
- Billing webhook body validation checks.
- Upload security and content scanning checks.
- Log sanitization checks.
- Audit chain and audit coverage checks.
- Release readiness gates.

Compliance positioning:

- The product supports AI governance workflows and EU AI Act readiness operations.
- Legal interpretations, official filings, certifications, and regulatory submissions require qualified professional review.
- Customer-facing compliance claims must be backed by evidence before publication.

---

## Release checklist

Before shipping a production release:

- [ ] Dependencies installed with `npm ci`.
- [ ] `package.json` and `package-lock.json` aligned.
- [ ] `.env.example` reviewed and production secrets configured only in provider secret stores.
- [ ] Supabase migrations applied to the target environment.
- [ ] Supabase Auth Site URL, redirect allowlist and OAuth providers configured.
- [ ] RLS policies reviewed and validated.
- [ ] Stripe products, prices, and webhook endpoint configured.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run security:auth-tokens` passes.
- [ ] `npm run security:authorization-bola` passes.
- [ ] `npm run security:protected-routes` passes.
- [ ] `npm run security:step-up` passes.
- [ ] `npm run security:ci` passes or failures are documented and accepted by the owner.
- [ ] `npm run release:readiness` passes for release evidence.
- [ ] Billing checkout tested with Stripe test mode before live promotion.
- [ ] Webhook processing verified in target environment.
- [ ] Audit/logging behavior reviewed for sensitive data exposure.
- [ ] Rollback path identified before deployment.
- [ ] No secrets, private keys, customer data, or sensitive screenshots are committed.

---

## Security contact

For responsible disclosure or security concerns, contact the project owner through the configured support channel:

```text
support@risckcomply.app
```

Use a clear subject line such as:

```text
[SECURITY] Vulnerability report for Risck Comply
```

Please include the affected route, reproduction steps, potential impact, safe proof-of-concept details and suggested remediation when available.
