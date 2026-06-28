# RISCK COMPLY / EuroComply

Enterprise AI compliance SaaS for European organizations that need to operationalize AI governance, EU AI Act readiness, risk controls, evidence, documents, audit trails, billing, and multi-tenant organization management.

RISCK COMPLY / EuroComply is designed for B2B teams that need a practical control plane for how artificial intelligence is adopted, reviewed, documented, monitored, and governed across an organization.

> This product helps teams organize compliance work and evidence. It does not replace legal advice, regulatory counsel, or a formal external audit.

---

## 1. Product name and short description

**RISCK COMPLY / EuroComply** is an enterprise-grade SaaS platform for AI compliance operations.

The application provides a structured workspace where organizations can register AI systems, classify risk, track EU AI Act readiness, manage governance evidence, generate or maintain compliance documents, review audit activity, and manage subscription billing.

---

## 2. Value proposition

Companies adopting AI often struggle with scattered tools, undocumented usage, unclear ownership, inconsistent risk assessment, and weak evidence trails.

RISCK COMPLY / EuroComply centralizes that operating model into one platform:

- One source of truth for AI systems and usage.
- Risk and readiness views aligned with AI governance workflows.
- Evidence and audit records that support internal reviews.
- Organization-level access control for B2B teams.
- Billing and plan gating for commercial SaaS operations.
- Security checks and release gates built into the development workflow.

The goal is to help teams move from informal AI usage to documented, accountable, and reviewable AI governance.

---

## 3. Target audience

The product is built for European and Europe-facing organizations, especially:

- SaaS companies using or embedding AI features.
- CTOs, founders, and engineering leaders managing AI adoption.
- Compliance, risk, security, legal, and governance teams.
- Fintechs, HR platforms, AI agencies, consultancies, and regulated B2B services.
- SMEs and enterprise teams preparing for AI governance expectations.

---

## 4. Key features

### AI governance and readiness

- AI inventory for internal and vendor AI systems.
- Risk classification support for minimal, limited, high, and unacceptable risk patterns.
- Readiness dashboard for AI compliance posture and operational gaps.
- EU AI Act transparency workflows and deadline-oriented guidance.

### Evidence and documentation

- Compliance document records.
- Assessment records and recommendations.
- Governance evidence tracking.
- Audit log support for important user and system actions.
- CSV/export-oriented operational workflows where implemented.

### Multi-tenant B2B operations

- Organization/workspace model for customer isolation.
- Membership-based access patterns.
- Role-aware product and billing actions.
- Plan-aware feature access.

### Billing

- Stripe checkout integration for self-serve plans.
- Stripe webhook handling for subscription/payment lifecycle events.
- Server-side price mapping through environment variables.
- Billing actions protected by authenticated user and permission checks.

### Security-oriented engineering

- Security scripts for RLS, public secret scanning, production secret readiness, API hardening, headers, upload checks, webhook handling, audit coverage, supply-chain checks, and release readiness.
- Explicit release gates for production and enterprise readiness.
- No committed production secrets.

---

## 5. Technical stack

The stack is intentionally aligned with a modern B2B SaaS architecture:

- **Framework:** Next.js 15 App Router.
- **Language:** TypeScript.
- **Runtime/UI:** React 19.
- **Styling:** Tailwind CSS 4, Radix UI primitives, shadcn-style components, custom enterprise UI system.
- **Charts and dashboard UI:** Recharts and custom dashboard components.
- **Animation:** Framer Motion where needed.
- **Authentication:** Clerk integration in the active auth hook.
- **Database:** Supabase/Postgres.
- **Authorization:** Supabase Row Level Security and server-side permission guards.
- **Payments:** Stripe.
- **Validation:** Zod.
- **Testing:** Vitest and Playwright.
- **Linting/type safety:** ESLint and TypeScript.
- **Observability hooks:** Sentry configuration is supported by environment variables when enabled.
- **Product analytics hooks:** PostHog EU configuration is supported by environment variables when enabled.

No SOC 2, ISO 27001, formal penetration test, or external certification is claimed in this README.

---

## 6. Architecture summary

At a high level, the application follows this model:

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

## 7. Folder structure

Representative structure of the application:

```text
.
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── page.tsx
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

## 8. Required environment variables

Use `.env.example` as the canonical template. Copy it locally and fill only the values required for the environment being used.

```bash
cp .env.example .env.local
```

### Application

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SITE_URL=
TRUSTED_ORIGINS=
NODE_ENV=
RELEASE_TARGET=
```

### Clerk authentication

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=
```

### Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=
```

### Supabase Auth / OAuth redirect allowlist

These values may be relevant for environments that still use Supabase Auth/OAuth configuration or migration paths. Keep the active authentication strategy consistent per environment.

```bash
SUPABASE_AUTH_SITE_URL=
SUPABASE_AUTH_REDIRECT_URLS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Stripe

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ESSENTIAL_MONTHLY=
STRIPE_PRICE_PROFESSIONAL_MONTHLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
```

### Email

```bash
RESEND_API_KEY=
EMAIL_FROM=
SUPPORT_EMAIL=
```

### Security, health checks, jobs, and rate limiting

```bash
HEALTHCHECK_TOKEN=
AUDIT_CHAIN_SIGNING_SECRET=
EVIDENCE_PACK_SIGNING_SECRET=
STEP_UP_SIGNING_SECRET=
CRON_SECRET=
INTERNAL_CRON_SECRET=
DAILY_MAINTENANCE_JOB_TIMEOUT_MS=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Upload scanning

```bash
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=
MALWARE_SCANNER_PROVIDER=
MALWARE_SCANNER_ENDPOINT=
MALWARE_SCANNER_URL=
MALWARE_SCANNER_API_KEY=
MALWARE_SCANNER_ALLOWED_HOSTS=
MALWARE_SCANNER_CLAMAV_HOST=
MALWARE_SCANNER_CLAMAV_PORT=
MALWARE_SCANNER_TIMEOUT_MS=
```

### Observability and analytics

```bash
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
NEXT_PUBLIC_POSTHOG_ASSET_HOST=
```

### CI/CD provider values

```bash
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

Never commit real secrets. Public `NEXT_PUBLIC_*` variables are visible to the browser and must never contain private keys.

---

## 9. Run locally

Prerequisites:

- Node.js compatible with the project dependencies.
- npm, using the package manager declared in `package.json`: `npm@10.8.2`.
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

Fill `.env.local` with local/test values only.

Run the development server:

```bash
npm run dev
```

The app starts on `http://localhost:3000`.

Debug mode is available through:

```bash
npm run dev:debug
```

---

## 10. Run tests

Unit/integration tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

End-to-end tests:

```bash
npm run test:e2e
```

Playwright UI mode:

```bash
npm run test:e2e:ui
```

---

## 11. Lint, typecheck, and build

Run lint:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run production build:

```bash
npm run build
```

The build has a `prebuild` hook that runs:

```bash
npm run security:zod-compat
```

Recommended combined verification:

```bash
npm run phase2:ci
```

Production readiness gate:

```bash
npm run release:production-readiness
```

---

## 12. Security checks

Primary security gate:

```bash
npm run security:ci
```

Focused security checks:

```bash
npm run security:package-lock
npm run security:npm-audit:all
npm run security:public-secrets
npm run security:production-secrets
npm run security:supply-chain
npm run security:ci-cd
npm run security:rls:advisory
npm run security:api-guards
npm run security:headers
npm run security:billing-webhook-body
npm run security:upload
npm run security:upload-content-scan
npm run security:responses
npm run security:logs
```

RLS checks:

```bash
npm run security:rls
npm run security:rls:advisory
npm run security:rls:live
```

Release security gates:

```bash
npm run release:readiness
npm run release:enterprise-readiness
```

These scripts are engineering controls and evidence checks. They are not a substitute for external legal review, third-party audit, or formal certification.

---

## 13. Deployment

The project is designed to deploy cleanly to Vercel or another Next.js-compatible platform.

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

Deployment readiness command:

```bash
npm run release:production-readiness
```

Vercel environment readiness:

```bash
npm run ops:vercel-readiness
```

Do not place production secrets in GitHub files, screenshots, issue comments, pull request descriptions, or public logs.

---

## 14. Authentication model

The active client authentication hook uses Clerk primitives for user, session, email/password sign-in, sign-up, Google OAuth redirect, and sign-out flows.

Auth responsibilities:

- Clerk manages user identity and session state.
- The application reads the authenticated user through client hooks and server-side auth helpers.
- Protected server operations must re-check identity and permissions on the server.
- UI state alone must never be treated as authorization.
- Supabase stores application data and enforces tenant-aware access controls through RLS and server-side guards.

Google OAuth is configured through the active auth provider and redirect URLs. Keep OAuth callback URLs exact for local, preview, and production environments.

---

## 15. Multi-tenant model

RISCK COMPLY / EuroComply is structured around organizations/workspaces.

Tenant isolation principles:

- Each customer account is represented by an organization or workspace record.
- Members are linked through membership tables such as `organization_members` and/or `workspace_members` depending on the active module.
- Product data such as AI tools, assessments, documents, monitoring preferences, audit logs, subscriptions, and payments is scoped to the tenant identifier.
- Server-side queries resolve the current organization for the authenticated user.
- Role and permission checks protect sensitive actions such as billing management.
- Client-provided tenant IDs should be treated as untrusted unless validated against server-side membership.

Common roles should be treated as implementation details unless explicitly enforced in code and database policies.

---

## 16. Stripe billing model

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

## 17. Supabase RLS model

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

## 18. Security and compliance posture

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

## 19. Release checklist

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
- [ ] `npm run release:production-readiness` passes before production promotion.
- [ ] Billing checkout tested with Stripe test mode before live promotion.
- [ ] Webhook processing verified in target environment.
- [ ] Audit/logging behavior reviewed for sensitive data exposure.
- [ ] Rollback path identified before deployment.
- [ ] No secrets, private keys, customer data, or sensitive screenshots are committed.

Enterprise release gate:

```bash
npm run release:enterprise-readiness
```

---

## 20. Contributing

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

## 21. Security contact

For responsible disclosure or security concerns, contact the project owner through the configured support channel:

```text
support@risckcomply.app
```

Use a clear subject line such as:

```text
[SECURITY] Vulnerability report for RISCK COMPLY / EuroComply
```

Please include:

- Affected route, feature, or component.
- Reproduction steps.
- Potential impact.
- Any proof-of-concept details that are safe to share.
- Suggested remediation, if available.

Do not disclose suspected vulnerabilities publicly until the project owner has had reasonable time to investigate and remediate.
