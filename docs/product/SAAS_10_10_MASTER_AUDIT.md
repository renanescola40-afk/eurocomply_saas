# SaaS 10/10 Master Audit

Audit date: 2026-06-30  
Audited repository: `renanescola40-afk/eurocomply_saas`  
Audited product name in repo: **Risck Comply**  
Audit role: Staff Software Engineer + Principal Security Engineer + SRE + Product Manager B2B SaaS + QA Lead + UX Lead + Compliance PM  
Evidence basis: repository source/docs only. No live production environment, no browser screenshots, no external security report, and no payment/provider consoles were accessed during this audit.

## Executive verdict

**Current decision: No-Go for “10/10”, No-Go for “enterprise-ready”, and No-Go for unrestricted public production launch.**

Risck Comply is no longer a basic prototype. The repo contains a serious B2B SaaS foundation: Next.js App Router, Clerk auth integration, Supabase/Postgres, Stripe billing, organization-level RBAC, RLS migrations, public/private route protection, runtime readiness scripts, smoke-test automation, release gates, audit trails, and a strong documentation posture.

However, the project still cannot honestly be called **100% ready**, **enterprise-ready**, or **10/10** because the repo’s own release evidence register currently says **No-Go** and still has open or exception-blocked runtime proof for deployment smoke, final validation, external security review/pentest, audit-chain live validation, step-up MFA/IdP proof, branch protection revalidation, and rollback functional proof.

The honest market position today is: **strong MVP / early-access B2B SaaS with unusually strong engineering controls for its stage, but not yet enterprise-procurement-ready.**

## Hard scorecard

| Area | Score | Verdict | Why |
| --- | ---: | --- | --- |
| Security | 7.0/10 | Strong foundation, not final | Good middleware, RBAC, RLS, API guard and billing hardening patterns exist, but live runtime evidence and external review are not complete. |
| Product | 7.1/10 | Useful MVP+ | Core surfaces exist or are represented: landing, onboarding, dashboard, inventory, docs, tasks, vendors, reports, billing. Needs proof that every critical flow works end-to-end with real users/data. |
| UX/UI | 7.0/10 | Premium direction, not fully proven | Enterprise dark direction and UX acceptance docs exist. Missing current screenshots/video evidence for mobile/tablet/desktop and authenticated flows. |
| Billing | 7.5/10 | Best-developed commercial subsystem | Stripe checkout, portal, webhook, signature verification, idempotency, subscription sync and entitlements are present. Needs full live Stripe runtime revalidation before selling broadly. |
| Operation | 6.3/10 | Good runbooks, evidence gaps remain | Observability/runbooks and release scripts exist, but deployment smoke, rollback, final validation and incident drill evidence are incomplete/open. |
| CI/CD | 7.2/10 | Broad checks, branch proof not final | Many scripts and workflows exist. Repo evidence still marks branch protection/required checks as exception pending final revalidation. |
| Enterprise readiness | 5.2/10 | Not enterprise-ready yet | Cannot pass enterprise procurement without external review, runtime evidence, branch protection proof, rollback proof, live RLS proof freshness, and signed release decision. |
| Public production readiness | 4.8/10 | Do not launch as “fully ready” | Production smoke evidence file is missing and P0 register says No-Go. Public launch should wait for smoke + runtime validation. |
| Commercial competitiveness | 6.8/10 | Promising, needs proof and polish | Positioning is relevant for EU AI governance. Needs tighter claims, customer proof, clearer demo/trial path, competitive comparison and trust evidence. |

## Evidence sampled

This audit reviewed representative files and docs from the current repository state:

- `README.md` positions the product as a European AI compliance operations SaaS and explicitly avoids replacing legal advice, certification or external audit.
- `src/middleware.ts` combines Clerk auth and i18n, redirects unauthenticated private routes to localized login, sends authenticated users from auth/home surfaces to onboarding, and applies `Cache-Control: private, no-store, max-age=0` to private redirects.
- `src/app/[locale]/onboarding/page.tsx` uses dynamic/no-store behavior, requires auth, redirects completed organizations to `dashboard/organizations`, and wires server actions for draft save and activation.
- `src/server/actions/onboarding.ts` validates onboarding input with Zod, creates/updates the organization, creates the first AI system, recommended document records, initial compliance tasks, invitations, and an activation run.
- `src/lib/security/permissions.ts` and `src/server/auth/permissions.ts` define role/permission gates for organization, team, billing, documents, vendors, risks, tasks, reports, exports and audit access.
- `supabase/migrations/20260620120000_enterprise_multi_tenant_rls_final_lock.sql` enables RLS and applies organization-scoped/backend-only policies for major tenant tables.
- `src/app/api/billing/checkout/route.ts` requires API user, billing permission, trusted mutation/origin/rate-limit guard, step-up verification, bounded JSON parsing and server-side Stripe checkout creation.
- `src/app/api/billing/portal/route.ts` requires authenticated billing permission, trusted mutation, rate limit and step-up before creating a Stripe billing portal session.
- `src/app/api/billing/webhook/route.ts` applies rate limit, bounded body size, Stripe signature verification and sanitized responses.
- `src/server/billing/stripe-webhooks.ts` supports subscription/payment lifecycle events, event claiming/idempotency, subscription sync, entitlement persistence, duplicate handling and audit logging.
- `package.json` contains extensive security, runtime, release, production readiness, smoke, RLS, billing, upload, observability and CI scripts.
- `scripts/release/run-deployment-smoke.mjs` is a strong production smoke-test runner covering public pages, security headers, health/ready, protected redirects, no-store, Stripe/Supabase/Sentry readiness, rollback target, commit SHA and build SHA.
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` currently records **Current final decision: No-Go** and still has Open/Exception items.
- `docs/security/evidence/runtime/deployment-smoke-validation.json` was not present in the repository at audit time.

## What is good already

### 1. Product architecture is real, not just marketing screens

The SaaS has a recognizable B2B operating model: organizations, members, AI systems, documents, tasks, vendors, risks, audit logs, billing and onboarding. That is the right domain skeleton for an AI governance product.

### 2. Authentication and onboarding flow are moving in the right direction

The middleware now sends authenticated users to onboarding rather than skipping directly to the dashboard. Onboarding is not just visual: it persists organization profile data, first AI system data, risk classification, readiness score, recommended documents, tasks and invitations.

### 3. Multi-tenant security has serious implementation effort

The repo includes role/permission abstractions plus Supabase RLS migrations for org-scoped tables and backend-only tables. This is exactly the type of architecture enterprise buyers expect to see, but it still needs current live proof before it can be trusted as a release claim.

### 4. Billing is unusually mature for an MVP

Stripe checkout, portal, webhook signature validation, bounded body read, subscription sync, entitlements, idempotency and audit logging are present. This is one of the strongest areas of the codebase.

### 5. Release thinking exists

The project has scripts for production smoke, release readiness, rollback, runtime evidence, security CI, branch protection evidence, external review and operational readiness. The issue is not “no process exists”; the issue is “the final runtime proof is not complete yet.”

### 6. Claim discipline exists in README

The README explicitly says the product does not replace legal advice, regulatory counsel, certification, or formal external audit. That discipline must also be enforced in landing/pricing/trust copy.

## P0 blockers

These block public production launch, enterprise-ready claims, and any “10/10” claim.

| Blocker | Evidence | Risk | Required fix |
| --- | --- | --- | --- |
| P0 runtime register is No-Go | `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` says current final decision is No-Go. | Shipping against your own release gate destroys credibility. | Make every P0 item Complete with real runtime evidence, or keep launch blocked. |
| Deployment smoke evidence missing | `docs/security/evidence/runtime/deployment-smoke-validation.json` not found. | Cannot prove production URL, `/api/health`, `/api/ready`, public pages, protected redirects, no-store, headers, rollback, commit/build SHA. | Run `npm run production:smoke` from a network-capable release runner and commit/attach evidence. |
| Final validation runner still open | P0 register marks final validation runner Open. | No trusted “single command” release proof. | Run the full final validation bundle and store signed output. |
| External security review/pentest still open | P0 register marks external review/pentest Open. | Enterprise buyers will not accept self-attestation for security-critical SaaS. | Complete an external review or scoped pentest and add redacted evidence. |
| Branch protection/required checks are exception-based | P0 register marks branch protection and required checks as Exception. | Direct-to-main or missing required checks could let unsafe changes ship. | Revalidate current `main` protection, required checks and admin bypass rules. |
| Audit-chain live validation exception | P0 register marks audit-chain live validation as Exception. | Audit trail may not be legally/operationally trustworthy. | Run target-live audit-chain validation and make evidence Complete. |
| Step-up MFA/IdP validation exception | P0 register marks step-up MFA/IdP validation as Exception. | Sensitive billing/admin actions may be guarded in code but not proven with provider-level runtime behavior. | Run provider-backed step-up validation and attach proof. |
| Rollback proof exception | P0 register marks rollback owner/target as Exception. | If production breaks, recovery may be theoretical. | Run rollback dry-run and functional target health verification. |
| No fresh live smoke of protected/private flows | Existing scripts exist, but evidence is absent. | Authenticated dashboard/onboarding/billing may break in production despite static checks. | Run authenticated Playwright smoke with owner/admin/member/viewer fixtures. |
| No current visual evidence | UX checklist requires screenshots/video, but none were produced in this audit. | Premium dark enterprise quality cannot be proven by code review alone. | Capture mobile/tablet/desktop screenshots for public + authenticated flows. |

## P1 blockers

These do not necessarily block a controlled private beta, but they block a confident paid public launch.

| Blocker | Risk | Required action |
| --- | --- | --- |
| Product naming still has legacy friction | Repo name is EuroComply, active product is Risck Comply, and some legacy/docs may still mention EuroComply. | Buyer confusion, weaker brand trust, support inconsistency. | Finish brand cleanup: customer-facing copy uses one name only. |
| “Risck” spelling needs deliberate brand decision | “Risck” may look like a typo for “Risk.” | Enterprise buyers may read it as unpolished unless the brand story is explicit. | Either justify the name in brand system or rename before launch. |
| Competitive positioning not yet buyer-grade | Product explains features, but not enough proof vs Vanta/Drata-style governance tooling or dedicated AI governance platforms. | Harder to convert CTO/compliance buyers. | Add comparison matrix, use cases, ROI and readiness methodology. |
| Pricing clarity needs runtime proof | Plans exist with limits/prices, but checkout readiness depends on configured Stripe price IDs. | User can click plan and hit setup failure if env is missing. | Show only checkout-ready plans in production or redirect Enterprise/demo safely. |
| Team/roles need E2E proof | RBAC exists, but reviewer/member/viewer journeys must be tested. | Users may see actions they cannot perform, or fail in unclear ways. | Add role matrix E2E for owner/admin/member/viewer. |
| Vendor, documents, reports and tasks need “real data” proof | Tables/routes exist, but not all flows were manually exercised here. | Product may feel hollow after signup. | Run seeded demo walkthrough with screenshots. |
| Legal/compliance claims require legal review | README is careful, but landing/trust copy must be fully checked. | False regulatory claims can create sales/legal risk. | Legal review all claims: AI Act readiness, risk classification, policies, audit evidence. |
| Mobile/tablet not proven | UX checklist defines requirements. | Buyer demos on phone/tablet may feel broken. | Run responsive Playwright + screenshots. |
| Support/trust operations need public package | Trust Center exists, but customer-facing evidence package needs polish. | Enterprise prospects cannot self-serve procurement answers. | Create downloadable security/trust packet with clear current status. |

## Surface-by-surface audit

### Product

**Status: good MVP+, not final product.**

Strengths:

- The product has the correct B2B primitives: orgs, members, AI systems, documents, tasks, vendors, risks, audit, billing.
- Onboarding creates real artifacts rather than dumping the user into an empty dashboard.
- README positioning is practical and avoids legal overclaiming.

Weaknesses:

- Product completeness is not proven by an end-to-end, fresh, authenticated demo run.
- No evidence in this audit that every button/CTA is wired and useful across all public/private pages.
- Feature claims must stay anchored to what is implemented and validated.

Verdict:

- Sellable today only as **private beta / design partner / pilot**.
- Not sellable today as **fully enterprise-ready AI compliance platform**.

### Landing page

**Status: promising, needs buyer-proof review.**

Strengths:

- Public landing is a real route and uses `EnterpriseHome`.
- README has disciplined positioning.

Weaknesses:

- No screenshot evidence reviewed.
- Need copy audit for claims, specificity, CTA hierarchy, proof, pricing/demo path and trust signals.
- Must avoid generic “AI compliance solved” claims.

Required before launch:

- Capture desktop/mobile screenshots.
- Audit every CTA path.
- Ensure claims say “supports readiness/evidence/workflows,” not “guarantees compliance.”

### Pricing

**Status: structurally present, runtime-dependent.**

Strengths:

- Plans exist: Starter €49, Growth €149, Enterprise €990 monthly in code.
- Entitlements and limits are defined in code.
- Stripe price IDs are server-side env-driven.

Weaknesses:

- Checkout depends on provider env being configured.
- Enterprise self-serve at €990 may not be ideal; enterprise may need demo/security review first.
- Need buyer-friendly plan comparison and cancellation/trial copy.

### Trust Center

**Status: strong documentation direction, not procurement-ready.**

Strengths:

- Security docs and evidence registers exist.
- README avoids SOC 2/ISO/pentest claims.

Weaknesses:

- External review is Open.
- Branch/rollback/audit/step-up proof is not fully Complete.
- Trust Center must clearly show current controls vs planned controls.

### Login/signup/auth

**Status: solid direction, needs runtime proof.**

Strengths:

- Middleware protects localized private routes.
- Authenticated users route to onboarding.
- Unauthenticated users are redirected to localized login with `next`.

Weaknesses:

- `middleware.ts` bypasses `/next_api` and asset routes, which is intentional only if every API route has its own guards. Keep scanners strict.
- No live OAuth/session evidence was produced in this audit.

### Onboarding

**Status: one of the strongest product areas.**

Strengths:

- Requires auth.
- Uses `noStore`/dynamic behavior.
- Saves organization profile, first AI system, risk classification, readiness score, recommended documents, tasks, invitations and activation run.

Weaknesses:

- Needs full E2E proof against production Supabase/Clerk.
- Needs graceful recovery proof for partial save/failed activation.

### Dashboard

**Status: likely strong, not proven here visually.**

Strengths:

- Enterprise dashboard acceptance criteria exist.
- Authenticated route protection exists.

Weaknesses:

- No screenshots/video evidence.
- Need proof for empty/loading/error/permission states.

### AI inventory and risk classification

**Status: functionally present through onboarding and domain model, but needs expert/legal calibration.**

Strengths:

- First AI system creation and classifier invocation exist.
- Risk signals include personal data, human interaction, generated content, biometric identification and manipulative/exploitative patterns.

Weaknesses:

- Risk classification must be positioned as support, not legal determination.
- Need validation examples by sector/use case.

### Documents, tasks, vendors, reports

**Status: present as product modules, not fully proven end-to-end in this audit.**

Strengths:

- Onboarding can create recommended document records and tasks.
- Permissions include documents/tasks/vendors/risks/reports.

Weaknesses:

- Need seeded flow proof: create, view, edit, delete, export, permission-denied, audit trail.
- Need verify every page avoids placeholder/demo data presented as real data.

### Billing

**Status: comparatively mature.**

Strengths:

- Checkout route requires authenticated API user, billing permission, trusted mutation, rate limit, bounded JSON, step-up and server-side Stripe creation.
- Portal route requires billing permission, trusted mutation, rate limit and step-up.
- Webhook route uses Stripe signature verification, payload size limit, rate limiting and sanitized no-store responses.
- Webhook processing supports idempotency, supported lifecycle events, subscription sync, entitlements, duplicate handling and audit logs.

Weaknesses:

- Needs fresh live Stripe validation before launch.
- Need prove checkout success/cancel, portal, upgrade/downgrade/cancel, payment failure, webhook replay and entitlement sync in a real test-mode Stripe environment.

### Security

**Status: strong code posture, incomplete release proof.**

Strengths:

- Auth/RBAC/RLS/API guards/security headers/no-store/rate limit/origin guards/webhook body guards/upload checks/scripts exist.
- RLS migration pattern is strong and table-aware.

Weaknesses:

- External review/pentest missing.
- P0 runtime evidence not fully complete.
- Need verify every sensitive server action/API route has auth, tenant check, permission check, origin/rate limit where applicable, no-store and sanitized errors.

### Operation and SRE

**Status: well-documented, not release-proven.**

Strengths:

- Observability evidence exists.
- Runbooks exist.
- Deployment smoke script is strong.

Weaknesses:

- Missing deployment smoke evidence file.
- Rollback proof exception remains.
- Need incident drill evidence and current deployment health record.

### Commercial readiness

**Status: strong idea, still weak proof.**

Strengths:

- EU AI Act readiness / governance is a real urgent market.
- Product has the right narrative: AI inventory, risks, documents, evidence, audit trail, team roles.

Weaknesses:

- Needs buyer-grade proof: screenshots, demo video, trust pack, customer-facing docs, comparison, pricing FAQ, pilot offer.
- Needs careful legal/compliance language.

## What can be sold today

You can sell:

- Private beta access.
- Design partner pilot.
- Founder-led demo.
- AI governance readiness workspace.
- AI system inventory and task/document workflow pilot.
- “EU AI Act readiness operations support,” with clear disclaimer that it is not legal advice.
- A paid pilot only if you manually verify each customer’s onboarding, billing and workspace after signup.

Recommended language:

> Risck Comply helps European teams organize AI governance work: AI system inventory, risk signals, evidence, policies, tasks, audit history and readiness workflows. It supports compliance operations; it does not replace legal counsel or certification.

## What must not be promised yet

Do not promise:

- Enterprise-ready.
- 10/10 production-ready.
- Guaranteed EU AI Act compliance.
- Legal certification.
- SOC 2 / ISO 27001 unless real certificates exist.
- External pentest completed unless real report exists.
- Fully automated compliance.
- “Zero-risk” AI governance.
- “Ready for every enterprise procurement process.”
- Production uptime/SLA without monitoring, incident and support evidence.
- Malware scanning / advanced upload security unless provider-backed validation is fresh.
- Billing reliability until live Stripe checkout/portal/webhook tests are green.

## High-impact improvements

1. Complete P0 runtime evidence register.
2. Produce and commit deployment smoke evidence.
3. Run final validation bundle from a clean runner.
4. Revalidate branch protection and required status checks on current `main`.
5. Complete external security review/pentest.
6. Produce Stripe test-mode checkout/portal/webhook/entitlement evidence.
7. Produce authenticated Playwright screenshots for owner/admin/member/viewer across desktop/tablet/mobile.
8. Audit every public claim for compliance-safe language.
9. Build a concise Trust Center procurement packet.
10. Create one polished demo dataset and walkthrough.
11. Decide whether “Risck Comply” spelling is intentional enough for enterprise buyers.
12. Remove or quarantine legacy EuroComply naming from customer-facing surfaces.

## 7-day plan

Day 1:

- Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` on a clean runner.
- Fix any failures.
- Freeze launch claims to “private beta / pilot.”

Day 2:

- Configure production URL, health token, build SHA, commit SHA and rollback target.
- Run `npm run production:smoke`.
- Commit/attach `docs/security/evidence/runtime/deployment-smoke-validation.json` only if it passes.

Day 3:

- Run Supabase live tenant isolation validation against production-like environment.
- Reconfirm RLS coverage for organizations, members, documents, tasks, vendors, risks, AI systems, audit logs and subscriptions.

Day 4:

- Run Stripe test-mode validation: checkout success/cancel, portal, subscription update/delete, payment failed, webhook replay, entitlement sync.
- Attach redacted evidence.

Day 5:

- Run authenticated E2E for onboarding, dashboard, AI inventory, documents, tasks, vendors, reports, billing and settings.
- Capture desktop/tablet/mobile screenshots.

Day 6:

- Revalidate branch protection, required checks, rollback dry-run, incident owner, support owner and customer communication path.

Day 7:

- Final go/no-go review.
- If any P0 item is Open/Exception, keep launch blocked and sell only private pilot.

## 30-day plan

Week 1: Finish P0 runtime evidence and stop all unsupported launch claims.  
Week 2: Complete product E2E coverage, screenshots, seed demo data, onboarding and dashboard polish.  
Week 3: External security review/pentest, legal/compliance copy review, trust packet, privacy/DPA/subprocessor review.  
Week 4: Competitive positioning, pricing/package refinement, founder-led demos, customer pilot onboarding, support playbook and launch decision.

## Final board decision

The board would approve continued development and private pilots, but would not approve broad public production launch or enterprise-ready positioning today.

The SaaS is on the right path. The remaining gap is not “write more nice docs”; the gap is **fresh runtime proof, external validation, full E2E buyer flow evidence and claim discipline**.
