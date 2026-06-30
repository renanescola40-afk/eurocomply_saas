# SaaS 10/10 Action Plan

Audit date: 2026-06-30  
Repository: `renanescola40-afk/eurocomply_saas`  
Product: **Risck Comply**  
Goal: move from strong MVP / early-access SaaS to a professional, secure, functional, sellable, visually premium and evidence-backed product.

## Operating rule

Do not call Risck Comply **10/10**, **enterprise-ready**, **fully production-ready**, or **guaranteed compliant** until every P0 release gate below is complete with real evidence.

The fastest path is not adding more marketing language. The fastest path is converting existing engineering work into verifiable runtime proof.

## Target state

Risck Comply can be called a sellable, trustworthy B2B SaaS only when all of these are true:

1. Public pages load in production: landing, pricing, trust, login.
2. Auth flows work: login/signup -> onboarding -> organization dashboard.
3. Onboarding persists real organization, AI system, classification, readiness score, recommended docs, tasks and team invitations.
4. Dashboard and all critical private modules are protected, tenant-scoped and role-aware.
5. Stripe checkout, portal, webhook, subscription sync and entitlements are proven in test-mode runtime evidence.
6. Supabase RLS live tenant isolation is current and attached to the assessed release.
7. Security headers and private/API `Cache-Control: no-store` are verified on deployment.
8. Branch protection and required checks are current on `main`.
9. Rollback target exists and rollback dry-run is proven.
10. Observability, incident response, support and customer communication flows are documented and tested.
11. External security review or pentest exists before enterprise procurement claims.
12. Landing/trust/pricing copy contains no false compliance, legal, security or certification claim.
13. Mobile, tablet and desktop screenshots/video prove premium UX.
14. The release evidence register says Go, not No-Go.

## P0 action plan

These items block broad public launch and enterprise-ready positioning.

| ID | Workstream | Action | Owner | Acceptance evidence | Command / artifact |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Release evidence | Make `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` fully green for the release candidate. | Release owner | Every required item is `Complete`; no Open/enterprise-blocking Exception. | `npm run security:p0-runtime-gap:strict` |
| P0-02 | Production smoke | Run production smoke against the actual production URL with health token, commit SHA, build SHA and rollback target set. | SRE / Platform | `deployment-smoke-validation.json` exists, outcome `passed`, no sensitive values. | `npm run production:smoke` |
| P0-03 | Final validation | Run clean-runner final validation: install, lint, typecheck, tests, build, security CI, route quality, release readiness. | Staff Engineer | Final validation artifact exists and references assessed commit. | `npm run release:production-readiness` or final runner command |
| P0-04 | Branch protection | Revalidate current `main` branch protection, required checks and admin bypass status. | Release owner | `branch-protection-required-checks.json` is current and `Complete`. | `npm run security:branch-protection-evidence` |
| P0-05 | Supabase live RLS | Run live tenant A/B isolation validation against production-like Supabase. | Principal Security | Evidence proves cross-tenant read/insert/update/delete denial and same-tenant allow cases. | `npm run security:rls:live` |
| P0-06 | Stripe runtime | Prove checkout, portal, webhook signature, webhook replay/idempotency, subscription sync, cancellation/update and payment failure. | Billing owner | `stripe-billing-validation.json` fresh for release candidate. | `node scripts/security/run-stripe-runtime-validation.mjs` |
| P0-07 | Step-up proof | Prove sensitive billing/admin actions require step-up/MFA/IdP behavior in the live provider. | Security reviewer | `step-up-mfa-validation.json` becomes `Complete`, not Exception. | `npm run security:step-up:runtime` |
| P0-08 | Audit-chain proof | Run audit-chain live validation against target environment. | Security reviewer | `audit-chain-live-validation.json` becomes `Complete`, not Exception. | `npm run security:audit-chain:live` |
| P0-09 | Rollback proof | Run rollback dry-run and verify rollback target `/api/health`. | SRE | `rollback-dry-run-validation.json` is Complete and references target. | `npm run release:rollback:dry-run` |
| P0-10 | External review | Complete external security review/pentest or documented independent review. | Founder / Security | Redacted report or attestation exists, with scope/date/fixes. | `external-security-review-or-pentest.json` |
| P0-11 | Authenticated E2E | Prove owner/admin/member/viewer flows. | QA Lead | E2E output + screenshots for onboarding, dashboard, inventory, docs, tasks, vendors, reports, billing/settings. | `npm run test:e2e` with credentials |
| P0-12 | Claim freeze | Freeze production copy until legal/security/compliance review. | Compliance PM | Landing/pricing/trust claims approved; no legal/certification overclaim. | Copy review artifact |

## P1 action plan

These items make the SaaS feel premium, credible and commercially sharp.

| ID | Area | Action | Acceptance criteria |
| --- | --- | --- | --- |
| P1-01 | Brand | Decide if **Risck Comply** is final or rename to avoid typo perception. | One customer-facing name across landing, app, docs, emails, metadata and screenshots. |
| P1-02 | Landing | Rebuild hero and sections around buyer pain: AI inventory chaos, EU AI Act pressure, evidence, board reporting, vendor exposure. | Above-the-fold explains who it is for, what it does, why now and the CTA. |
| P1-03 | Pricing | Add self-serve vs demo boundaries. | Starter/Growth can checkout only when Stripe price IDs are configured; Enterprise defaults to demo/contact unless explicitly configured. |
| P1-04 | Trust Center | Publish buyer-grade trust packet. | Security model, data processing overview, subprocessors, incident process, uptime/support stance, current limitations. |
| P1-05 | Dashboard | Turn dashboard into executive control room. | Readiness, risks, evidence, tasks, vendors, audit and billing are clear in 10 seconds. |
| P1-06 | AI inventory | Add import/export and examples. | User can create/edit AI system and understand risk level. |
| P1-07 | Risk classification | Add explainability. | Each classification has reasons, obligations, confidence, review reminder and legal disclaimer. |
| P1-08 | Documents | Add document lifecycle states. | Suggested, draft, in review, approved, expired; each state has action. |
| P1-09 | Tasks | Add owner/date/priority workflow. | Onboarding-created tasks become actionable work, not just records. |
| P1-10 | Vendors | Add vendor assessment flow. | Vendor AI exposure, DPA/security evidence and risk score visible. |
| P1-11 | Reports | Create board-ready report export. | PDF/CSV export is gated, sanitized and audit-logged. |
| P1-12 | Settings | Add organization, billing, team, security and notification settings. | Role-aware; permission-denied states are useful. |
| P1-13 | Accessibility | Run keyboard and contrast audit. | No keyboard trap, visible focus, labeled controls, no color-only status. |
| P1-14 | Mobile/tablet | Fix responsive rough edges. | No horizontal scroll; primary action reachable. |
| P1-15 | Empty/error/loading states | Standardize states across app. | Every data page has loading, empty, error, permission and success states. |

## Seven-day execution plan

### Day 1 — Clean baseline

Goal: know exactly what is broken.

Tasks:

- Pull latest `main` into a clean environment.
- Run `npm ci`.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Record output in release notes.
- Fix all deterministic failures before doing product polish.

Exit criteria:

- Clean local/CI baseline exists.
- Any failure has owner and fix PR.

### Day 2 — Production smoke and runtime config

Goal: prove the deployed SaaS is alive.

Tasks:

- Configure `RELEASE_PRODUCTION_URL` or `RELEASE_DEPLOYMENT_URL`.
- Configure `HEALTHCHECK_TOKEN`.
- Configure `RELEASE_COMMIT_SHA` and `RELEASE_BUILD_SHA`.
- Configure `RELEASE_ROLLBACK_TARGET` or `LAST_KNOWN_GOOD_DEPLOYMENT_URL`.
- Run `npm run production:smoke`.
- Commit/attach `docs/security/evidence/runtime/deployment-smoke-validation.json` only if passed.

Exit criteria:

- Production URL, health, ready, public pages, protected redirects, security headers, no-store, rollback, commit and build proof exist.

### Day 3 — Tenant isolation and API guards

Goal: prove tenants cannot cross boundaries.

Tasks:

- Run live Supabase RLS validation.
- Verify RLS policies are applied in the actual target project.
- Re-run API hardening checks: API guards, origin guards, BOLA/IDOR, no-store, security responses, log sanitization.
- Manually review any admin-client server action for tenant checks and permission checks.

Exit criteria:

- Fresh RLS artifact is Complete.
- No route/server action bypasses organization authorization.

### Day 4 — Billing runtime

Goal: prove money flow before selling.

Tasks:

- Verify Stripe test price IDs for Starter/Growth/Enterprise or disable checkout for unconfigured plans.
- Run checkout success/cancel.
- Run billing portal session.
- Trigger webhook events: checkout completed, subscription created/updated/deleted, payment failed, duplicate replay.
- Verify DB subscription row and entitlements update.
- Verify audit logs are written.

Exit criteria:

- Stripe runtime evidence is fresh and complete.
- Checkout cannot expose secrets or create wrong tenant billing sessions.

### Day 5 — Full product walkthrough

Goal: prove the user journey.

Tasks:

- Signup/login as owner.
- Complete onboarding.
- Confirm organization dashboard loads.
- Create/edit AI system.
- Review risk classification output.
- View recommended documents and tasks.
- Invite team member.
- Test permission states with admin/member/viewer.
- Test billing page.
- Test settings.
- Capture screenshots/video for desktop, tablet and mobile.

Exit criteria:

- Demo-ready walkthrough exists.
- Every broken CTA or missing state becomes a tracked issue.

### Day 6 — Trust, legal, copy and brand

Goal: make the SaaS credible without overclaiming.

Tasks:

- Review landing, pricing, trust, docs and dashboard copy.
- Remove any claim that implies guaranteed legal compliance, certification or external audit.
- Decide product naming and fix legacy customer-facing labels.
- Create a concise trust packet.
- Add pricing FAQ: trial, cancellation, upgrade/downgrade, data retention, security, support.

Exit criteria:

- Copy is safe, specific and buyer-grade.
- Trust Center reflects current evidence honestly.

### Day 7 — Go/No-Go board

Goal: make a disciplined release decision.

Tasks:

- Re-run final validation.
- Re-run P0 runtime gap strict mode.
- Review P0 register.
- Create release decision artifact.
- Decide: private pilot, public beta, or no-go.

Exit criteria:

- If any P0 is Open/Exception, decision remains No-Go for public/enterprise.
- If all P0s are Complete, approve controlled public beta with monitoring.

## Thirty-day roadmap

### Week 1 — Runtime proof and release gates

- Finish every P0 runtime evidence item.
- Create release candidate checklist.
- Remove unsupported enterprise-ready claims.
- Stabilize auth/onboarding/dashboard/billing.

### Week 2 — Product completeness and UX polish

- Complete E2E coverage for all buyer-critical flows.
- Polish premium dark enterprise UI.
- Standardize cards/buttons/forms/tables/modals/states.
- Add screenshots/video to PR evidence.
- Fix mobile/tablet issues.

### Week 3 — Security, compliance and trust package

- Complete external security review/pentest.
- Resolve findings.
- Publish redacted trust packet.
- Validate legal/compliance claims.
- Tighten privacy/DPA/subprocessor/security docs.

### Week 4 — Commercial launch readiness

- Create demo dataset and founder-led demo script.
- Launch waitlist/private beta campaign.
- Add sales pages for CTO, compliance officer and SaaS founder personas.
- Add competitor comparison and ROI calculator.
- Build customer onboarding/support process.
- Prepare public beta launch only if P0 evidence is green.

## Capability readiness matrix

| Capability | Current posture | Required to reach 10/10 |
| --- | --- | --- |
| Landing | Route exists and enterprise direction exists. | CTA audit, screenshots, claim review, conversion copy, no generic sections. |
| Pricing | Plans and entitlements exist. | Stripe runtime proof, unconfigured plan handling, cancellation/trial clarity. |
| Trust Center | Strong docs direction. | External review, current evidence packet, customer-facing procurement pack. |
| Login/signup | Middleware and auth flow exist. | Live OAuth/session proof and redirect loop regression tests. |
| Onboarding | Strong real-data flow. | Production E2E with failure/retry/partial-save states. |
| Dashboard | Enterprise UX acceptance exists. | Screenshot proof and real-data walkthrough. |
| AI inventory | Domain flow exists. | CRUD E2E, import/export, audit trail, permissions. |
| Risk classification | Classifier used in onboarding. | Explainability, examples, legal disclaimer, expert calibration. |
| Documents | Recommended records created. | Lifecycle, generation/export, approvals, expiry/review, audit. |
| Tasks | Initial tasks created. | Owner assignment, due dates, completion flow, notifications. |
| Vendors | Permission/domain included. | Vendor assurance workflow and evidence capture. |
| Reports | Permission/domain included. | Board-ready export and plan gate proof. |
| Billing | Mature server implementation. | Live test-mode proof and customer support flow. |
| Team/roles | Permission model exists. | Owner/admin/member/viewer E2E and UI visibility tests. |
| Settings | Expected product area. | Role-aware org/security/billing/notification settings. |
| Audit logs | Audit logging exists. | Live chain validation and tamper-evidence proof. |
| Upload security | Checks/evidence exist. | Runtime provider proof and fail-closed behavior. |
| Observability | Evidence exists. | Production smoke + drill + alert routing proof. |
| CI/CD | Many scripts/workflows exist. | Branch protection current and required checks enforced. |
| Rollback | Script/runbook exists. | Dry-run and target health proof. |

## Security hardening checklist

Before any launch decision, verify each item with code + runtime evidence:

- Every private page requires auth.
- Every private API route requires auth.
- Every mutation route has trusted origin or equivalent CSRF-like protection.
- Every mutation route has rate limit where abuse is plausible.
- Every object access checks `organization_id` and current membership.
- Every sensitive action checks RBAC permission.
- Billing actions require billing permission and step-up.
- Stripe webhook requires signature and bounded body size.
- Webhook processing is idempotent.
- RLS is enabled on tenant tables in the target Supabase project.
- Backend-only tables cannot be written by normal authenticated clients.
- Private/API sensitive responses use `Cache-Control: no-store`.
- Error responses do not expose SQL/provider/token/internal stack details.
- Logs redact tokens, cookies, auth headers, emails, payment fields and secrets.
- Upload handling has size, type, storage path and malware/content scan behavior.
- Public `NEXT_PUBLIC_*` variables contain no secrets.
- Release artifacts contain no token values or secret names unless intentionally harmless.

## UX/UI 10/10 checklist

A page cannot be called premium if any of these are false:

- The page has one obvious primary job.
- The primary CTA works or explains why it cannot work.
- There is no lorem ipsum, vague “coming soon,” dead button or `/undefined` route.
- Loading state names what is loading.
- Empty state explains why empty and gives one safe next action.
- Error state is human, not raw provider/framework output.
- Permission state explains role/plan limitation without leaking tenant data.
- Mobile layout has no horizontal scroll.
- Focus is visible on dark surfaces.
- Icon-only buttons have accessible labels.
- Tables collapse or remain readable on tablet/mobile.
- The design feels like an AI governance/control-room product, not a generic SaaS template.

## Commercial action plan

### Positioning

Use:

> AI governance readiness workspace for European teams using AI.

Avoid:

> Fully automated EU AI Act compliance.

Best buyer promise:

> Risck Comply helps teams inventory AI systems, classify risk signals, organize evidence, create governance tasks, maintain policy/document records and prepare a clearer AI Act readiness operating model.

### Buyer personas

1. SaaS founder/CTO: wants to avoid compliance chaos before enterprise sales.
2. Compliance officer: wants evidence, policies, ownership and audit trail.
3. AI agency/vendor: wants to show customers AI governance maturity.
4. HR/fintech/healthtech operator: wants high-risk AI visibility and board reporting.

### Sales motion

Use founder-led sales first:

- Landing CTA: “Join private beta” / “Book AI readiness demo.”
- Offer: 30-minute readiness walkthrough.
- Pilot package: setup organization, add first 5 AI systems, create initial evidence checklist.
- Do not rely on self-serve checkout until Stripe runtime is fully green.

### Pricing recommendation

Until runtime evidence is green:

- Starter: waitlist or private beta access.
- Growth: paid pilot only after manual onboarding.
- Enterprise: demo/contact only.

After runtime evidence is green:

- Starter/Growth self-serve can be enabled.
- Enterprise remains sales-assisted because enterprise buyers require security/legal review.

## Definition of done for “10/10”

Risck Comply reaches 10/10 only when:

- P0 register says Go.
- Production smoke passes and evidence is attached.
- Final validation passes from a clean runner.
- External security review is complete.
- Branch protection is enforced on `main`.
- Supabase RLS live validation is current.
- Stripe runtime validation is current.
- Rollback dry-run is current.
- Authenticated E2E passes for all critical roles.
- Every public/private critical route has screenshots on desktop/tablet/mobile.
- Legal/compliance claims are reviewed and safe.
- Trust Center is credible to a CTO/security/compliance buyer.
- No critical flow is broken.
- No primary CTA is dead.
- No tenant/object access is unguarded.
- No secret is exposed.
- No fake claim is made.

## Immediate next PRs

1. `fix/p0-deployment-smoke-evidence` — run and attach smoke evidence.
2. `fix/final-validation-runner-evidence` — clean runner validation output.
3. `fix/branch-protection-current-proof` — revalidate required checks.
4. `fix/stripe-runtime-validation-current` — live test-mode billing proof.
5. `fix/authenticated-e2e-critical-flows` — owner/admin/member/viewer coverage.
6. `fix/enterprise-ux-screenshots` — mobile/tablet/desktop visual proof.
7. `fix/compliance-copy-claim-review` — landing/pricing/trust claim cleanup.
8. `fix/trust-center-procurement-pack` — publish buyer-ready trust packet.

## Final recommendation

Do not slow down. The product is close enough to justify intense finishing work.

But do not launch with exaggerated claims. The right move is:

1. Finish P0 evidence.
2. Sell private pilots while evidence is still incomplete.
3. Move to public beta only after deployment smoke, billing runtime, RLS live validation, rollback and branch protection are green.
4. Move to enterprise procurement only after external security review and trust packet are complete.
