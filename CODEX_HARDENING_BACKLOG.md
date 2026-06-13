# Codex Hardening Backlog — EuroComply SaaS

This backlog is the controlled implementation queue for Codex-assisted hardening. Do not skip priority order unless a production incident requires it.

## Operating rules

1. Prefer small, reviewable patches.
2. Do not change user data contracts without explicit human approval.
3. Do not expose secrets or customer data in logs.
4. Every change must preserve auth, tenant isolation and RLS assumptions.
5. After every patch, run or document the expected checks: `npm run typecheck`, `npm run test`, `npm run build`, and security checks where applicable.
6. Record important decisions in `agent_log.json`.

## P0 — Must fix before broad B2B launch

### P0.1 Protect Enterprise/Premium demo exposure

Status: implemented in commit `09d1f0d420470ca352279f7dcf123bff0a6f9bd5`.

Current guard:

- `?demo=enterprise` and `?demo=premium` only activate when `NEXT_PUBLIC_ENABLE_ENTERPRISE_DEMO=true`.
- Production should keep this variable unset or false.

Acceptance criteria:

- Authenticated users cannot simulate Enterprise unless the environment flag is explicitly enabled.
- Real entitlements are used by default.

### P0.2 Make Enterprise/Premium a real billing contract or keep it demo-only

Problem:

- The UI can display Enterprise/Premium, but billing, Stripe prices, subscription persistence and entitlements must be aligned before selling it.

Tasks:

- Confirm final plan id: `premium` or `enterprise`.
- Add plan to pricing/catalog if it is meant to be sold.
- Add Stripe price/env mapping.
- Ensure webhook writes the correct plan id to subscriptions.
- Ensure entitlements read the same id.
- Hide demo-only controls in production.

Acceptance criteria:

- A real customer can subscribe and receive correct entitlements without query params.
- A non-paying customer cannot unlock Premium/Enterprise modules through client-side parameters.

### P0.3 Replace add-on placeholder state with persisted add-ons

Problem:

- `activeAddOnIds` is currently an empty array in the add-ons page.

Tasks:

- Create or confirm a table for organization add-ons.
- Read active add-ons server-side.
- Connect Stripe/add-on checkout or mark as manually provisioned.
- Keep included Premium add-ons unpurchasable.

Acceptance criteria:

- Add-ons bought/provisioned by an organization appear as active.
- Add-ons included in Premium/Enterprise appear as included.
- Users cannot buy the same add-on twice.

### P0.4 Verify latest deploy is actually live

Problem:

- Vercel deploys have previously failed due `upgradeToPro=build-rate-limit`.

Tasks:

- Check deploy status after quota reset or Pro upgrade.
- Confirm latest main commit is live.
- If not live, do not claim production is fixed.

Acceptance criteria:

- Latest commit is deployed successfully.
- No build-rate-limit or cron-limit errors remain.

### P0.5 Supabase migrations alignment

Problem:

- Runtime errors like `42703` indicate production schema drift.

Tasks:

- Apply all migrations in order.
- Confirm `ai_systems`, `ai_incidents`, `intelligence_items`, vendor columns and subscription columns exist.
- Verify RLS is enabled for tenant data.

Acceptance criteria:

- No `42703` column-missing errors in logs.
- Core modules do not rely on fallback data because tables are missing.

## P1 — Production reliability

### P1.1 Cron strategy for Vercel limits

Problem:

- Hobby deployments may not support the current number/frequency of cron jobs.

Tasks:

- Move to Vercel Pro, or reduce to a single daily aggregator cron.
- Ensure intelligence refresh does not break Hobby/Pro limits.

Acceptance criteria:

- Vercel accepts cron configuration.
- No deploy is blocked by cron plan limits.

### P1.2 Add runtime monitoring

Tasks:

- Add Sentry or equivalent error monitoring.
- Add uptime monitor.
- Add alerting for 5xx spikes and latency degradation.

Acceptance criteria:

- Production runtime errors are visible without user screenshots.
- Alerts exist for downtime and elevated errors.

### P1.3 Verify route map and legacy redirects

Tasks:

- Crawl known app routes.
- Keep `/undefined/...` normalizer active.
- Fix broken links instead of relying only on redirects.

Acceptance criteria:

- No dashboard links generate `/undefined/...`.
- Legacy `/undefined/...` routes redirect to valid destinations.

## P2 — Jornal IA / Intelligence

### P2.1 Real 24/7 news ingestion foundation

Problem:

- Current editorial personas and source registry exist, but real ingestion is not fully implemented.

Tasks:

- Create source ingestion jobs for official/regulatory/open sources first.
- Store source URL, author/publisher, publication date, jurisdiction, topic and rights policy.
- Generate original EuroComply summaries and analysis.
- Avoid copying full third-party copyrighted articles.

Acceptance criteria:

- New intelligence items are created daily from approved sources.
- Items include references and original analysis.
- Commercial media content remains metadata/summary/analysis only unless licensed.

### P2.2 Editorial review workflow

Tasks:

- Add draft/review/published workflow for intelligence items.
- Allow admin/editor to approve before publication.

Acceptance criteria:

- Automated ingestion does not blindly publish risky or low-confidence items.

## P3 — Enterprise readiness and exports

### P3.1 PDF executive export

Tasks:

- Add board-ready PDF export for Enterprise Readiness.
- Keep JSON export for technical/audit integrations.

Acceptance criteria:

- Executive users can download a readable PDF.
- Technical users can download signed JSON.

### P3.2 Evidence verification hardening

Tasks:

- Ensure evidence pack validation accepts uploaded JSON and pasted JSON.
- Verify hash mismatch and malformed package errors are clear.

Acceptance criteria:

- Auditors can validate exported packs without logging into customer tenant.

## P4 — Performance and scaling

### P4.1 Load-test plan

Tasks:

- Define target concurrency and routes.
- Test auth, dashboard, evidence, vendors, intelligence and exports.
- Record P95 latency and error rates.

Acceptance criteria:

- Clear capacity estimate for current Vercel/Supabase plan.
- Upgrade path documented.

### P4.2 Storage quotas

Tasks:

- Define storage quotas per plan.
- Enforce upload size/type limits.
- Ensure private bucket policies by organization.

Acceptance criteria:

- Customers cannot exceed plan storage silently.
- One organization cannot access another organization's files.
