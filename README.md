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

## What the product does

### AI governance and readiness

- Register internal and vendor AI systems.
- Capture system owner, department, usage context, country, provider, and risk signals.
- Classify and prioritize AI Act readiness work.
- Track gaps, actions, evidence, and audit history.
- Provide executive views for readiness and operational risk.

### Evidence and documentation

- Store compliance document records.
- Support generated or maintained governance documents.
- Connect assessments and recommendations to AI systems.
- Maintain audit activity for important product and security-sensitive actions.
- Support export-oriented workflows where implemented.

### Multi-tenant B2B operations

- Organization/workspace model for customer isolation.
- Membership-based access patterns.
- Role-aware product and billing actions.
- Plan-aware feature access.

### Billing

- Stripe checkout integration for self-serve plans.
- Stripe webhook handling for subscription and payment lifecycle events.
- Server-side price mapping through environment variables.
- Billing actions protected by authenticated user and permission checks.

### Security-oriented engineering

- Security scripts for RLS, public secret scanning, production secret readiness, API hardening, headers, upload checks, webhook handling, audit coverage, supply-chain checks, and release readiness.
- Explicit release gates for production and enterprise readiness.
- No committed production secrets.

---

## Current readiness stance

This repository contains many controls expected in a serious B2B SaaS, but readiness must be proven by the validation gates below and by environment-specific evidence.

Risck Comply must **not** be described as enterprise-ready unless the relevant checks pass and any blockers are documented or resolved.

No SOC 2, ISO 27001, formal penetration test, external certification, external legal review, or named customer proof is claimed in this repository unless a dated, reviewable artifact is added by the owner.

---

## Technical stack

- **Framework:** Next.js App Router.
- **Language:** TypeScript.
- **Runtime/UI:** React.
- **Styling:** Tailwind CSS, Radix UI primitives, shadcn-style components, custom enterprise UI system.
- **Charts and dashboard UI:** Recharts and custom dashboard components.
- **Authentication:** Clerk integration in the active auth hook.
- **Database:** Supabase/Postgres.
- **Authorization:** Supabase Row Level Security and server-side permission guards.
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
  -> Clerk user/session context
  -> Server queries, API routes, and security guards
  -> Supabase Postgres with tenant-aware tables and RLS
  -> Stripe checkout, customer, subscription, and webhook flows
  -> Audit/security evidence scripts and release gates
```

Core design principles:

- Keep tenant data scoped by organization/workspace identifiers.
- Never expose service-role credentials to the browser.
- Validate user identity and permissions on server-side operations.
- Keep billing authority on the server and in Stripe webhooks.
- Use environment variables for provider configuration and secrets.
- Treat security/release scripts as part of the product, not optional polish.

---

## Representative folder structure

```text
.
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── page.tsx
│   │   │   ├── pricing/
│   │   │   ├── trust/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       ├── organizations/
│   │   │       ├── inventario/
│   │   │       └── transparencia/
│   │   ├── api/
│   │   │   └── billing/
│   │   │       ├── checkout/
│   │   │       └── webhook/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── hooks/
│   │   └── useAuth.tsx
│   ├── integrations/
│   │   └── supabase/
│   ├── lib/
│   └── server/
├── scripts/
│   ├── dev/
│   ├── ops/
│   ├── quality/
│   └── security/
├── supabase/
├── docs/
├── .github/
│   └── workflows/
├── package.json
├── package-lock.json
└── README.md
```

The exact folder tree may evolve as modules are split into smaller route groups and server packages.

---

## Environment variables

Use `.env.example` as the canonical template. Copy it locally and fill only the values required for the environment being used.

```bash
cp .env.example .env.local
```

Common groups:

- Application URL and trusted origins.
- Clerk authentication keys and redirect URLs.
- Supabase URL, anon key, service role key, and migration/automation credentials.
- Stripe publishable key, secret key, webhook secret, and price IDs.
- Email provider keys.
- Security, health check, audit signing, cron, rate limiting, upload scanning, observability, analytics, and CI/CD provider values.

Never commit real secrets. Public `NEXT_PUBLIC_*` variables are visible to the browser and must never contain private keys.

---

## Run locally

Prerequisites:

- Node.js compatible with the project dependencies.
- npm, using the package manager declared in `package.json`.
- Supabase project or local Supabase environment.
- Clerk project for active authentication flows.
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

Route quality:

```bash
npm run quality:routes
npm run quality:routes:e2e
```

Security gates:

```bash
npm run security:ci
npm run security:rls
npm run security:api-guards
npm run security:no-store
npm run security:origin-guards
npm run security:upload
npm run security:billing-webhook-body
```

Production readiness gates:

```bash
npm run release:deployment-smoke
npm run release:rollback:dry-run
npm run release:readiness
npm run release:enterprise-readiness
```

Phase 1 hygiene/credibility gate:

```bash
npm run phase1:check
npm run quality:routes
npm run test -- tests/phase1/brand-credibility.test.ts
```

These scripts are engineering controls and evidence checks. They are not a substitute for external legal review, third-party audit, or formal certification.

---

## Deployment

The project is designed to deploy to Vercel or another Next.js-compatible platform.

Recommended deployment flow:

1. Configure production environment variables in the deployment provider secret store.
2. Apply Supabase migrations in the target Supabase project.
3. Confirm RLS is enabled and policies are aligned with tenant isolation requirements.
4. Configure Clerk production domains and redirects.
5. Configure Stripe live products, prices, and webhook endpoint.
6. Set the billing webhook endpoint to `/api/billing/webhook`.
7. Run local or CI readiness checks before promoting production.
8. Deploy from the protected production branch.
9. Verify auth, organization access, billing checkout, webhook handling, dashboard loading, and audit logs after deploy.

Do not place production secrets in GitHub files, screenshots, issue comments, pull request descriptions, or public logs.

---

## Authentication model

The active client authentication hook uses Clerk primitives for user, session, email/password sign-in, sign-up, Google OAuth redirect, and sign-out flows.

Auth responsibilities:

- Clerk manages user identity and session state.
- The application reads the authenticated user through client hooks and server-side auth helpers.
- Protected server operations must re-check identity and permissions on the server.
- UI state alone must never be treated as authorization.
- Supabase stores application data and enforces tenant-aware access controls through RLS and server-side guards.

Google OAuth is configured through the active auth provider and redirect URLs. Keep OAuth callback URLs exact for local, preview, and production environments.

---

## Multi-tenant model

Risck Comply is structured around organizations/workspaces.

Tenant isolation principles:

- Each customer account is represented by an organization or workspace record.
- Members are linked through membership tables such as `organization_members` and/or `workspace_members` depending on the active module.
- Product data such as AI tools, assessments, documents, monitoring preferences, audit logs, subscriptions, and payments is scoped to the tenant identifier.
- Server-side queries resolve the current organization for the authenticated user.
- Role and permission checks protect sensitive actions such as billing management.
- Client-provided tenant IDs should be treated as untrusted unless validated against server-side membership.

Common roles should be treated as implementation details unless explicitly enforced in code and database policies.

---

## Stripe billing model

Billing is implemented through server-side Stripe routes and webhook processing.

Core flow:

1. Authenticated user requests checkout for an allowed self-serve plan.
2. Server validates the request body and normalizes the plan.
3. Server resolves the current organization for the user.
4. Server checks billing permission before creating checkout.
5. Stripe price IDs are read from environment variables.
6. Stripe redirects the customer through Checkout.
7. Stripe sends lifecycle events to `/api/billing/webhook`.
8. The webhook validates provider delivery, processes subscription/payment changes, and writes audit records where implemented.

Important rules:

- Do not trust client-supplied user IDs, organization IDs, plan prices, or Stripe customer IDs.
- Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-side only.
- Use test mode keys locally and live keys only in production secret stores.
- Keep price IDs environment-specific.

---

## Supabase RLS model

Supabase/Postgres is used for application data and tenant-scoped records.

Representative tables include:

- `profiles`
- `workspaces`
- `workspace_members`
- `ai_tools`
- `ai_assessments`
- `compliance_documents`
- `monitoring_preferences`
- `audit_logs`
- `subscriptions`
- `payments`
- `regulatory_updates`

Representative RLS/helper functions include:

- `is_workspace_member`
- `can_manage_workspace`
- `can_use_monitoring`

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
- [ ] `.env.example` reviewed and production secrets configured only in provider secret stores.
- [ ] Supabase migrations applied to the target environment.
- [ ] RLS policies reviewed and validated.
- [ ] Clerk production settings and redirects configured.
- [ ] Stripe products, prices, and webhook endpoint configured.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run security:ci` passes or failures are documented and accepted by the owner.
- [ ] `npm run release:readiness` passes for release evidence.
- [ ] Billing checkout tested with Stripe test mode before live promotion.
- [ ] Webhook processing verified in target environment.
- [ ] Audit/logging behavior reviewed for sensitive data exposure.
- [ ] Rollback path identified before deployment.
- [ ] No secrets, private keys, customer data, or sensitive screenshots are committed.

---

## Contributing

Contribution expectations:

1. Create a focused branch for each change.
2. Keep pull requests small enough to review.
3. Include tests or validation notes for product, billing, auth, RLS, or security-sensitive changes.
4. Run lint, typecheck, tests, build, and relevant security checks before requesting review.
5. Update documentation when behavior, environment variables, routes, or deployment steps change.
6. Never commit secrets, production data, access tokens, private keys, or customer exports.
7. Treat changes to auth, billing, RLS, tenant isolation, file uploads, and audit logging as high-risk changes.

Suggested local gate before opening a PR:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
```

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

Please include:

- Affected route, feature, or component.
- Reproduction steps.
- Potential impact.
- Any proof-of-concept details that are safe to share.
- Suggested remediation, if available.

Do not disclose suspected vulnerabilities publicly until the project owner has had reasonable time to investigate and remediate.
