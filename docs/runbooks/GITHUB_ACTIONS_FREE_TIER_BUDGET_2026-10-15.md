# RISCK COMPLY — GitHub Actions Free-Tier Budget and Security Invariants

Date: 2026-10-15  
Scope: repository `renanescola40-afk/eurocomply_saas`  
Status: **cost-control changes prepared on isolated branch; NOT a bypass of required CI**.

## Why this exists

The owner-provided GitHub billing screen shows `2,000 / 2,000` included Actions minutes used in October 2026 and reset shown in 17 days. The billing view separately shows gross metered activity of **USD 661.44**, offset by **USD 661.44** in included usage/discounts, billable Actions usage displayed as **USD 0**, and a payment-history page saying no payments were made. These screenshots do **not** prove that a past payment attempt never failed, that a balance can never become due, or that private-repository execution is presently available.

GitHub Actions run `38812922098` failed *before starting the job*, with GitHub's annotation saying recent account payments failed **or** the spending limit needs increasing. At this checkpoint the exhausted included-minute allowance is a plausible current explanation, but the message is not itself a verified invoice or a code-test failure.

**Financial guardrail: zero additional spending without explicit owner approval.** Do not add payment methods, raise paid limits, create paid runners, switch code to a public repository, or suggest waiving essential security gates simply to obtain a green indicator.

## Targeted, reversible changes

| Existing workflow | Before | After | Preserved assurance |
|---|---|---|---|
| `pr-autopilot.yml` | Hourly fallback schedule (24 opportunities/day) | Every 6 hours (4/day) | All existing `pull_request_target` event types and on-demand run stay enabled |
| `enterprise-closeout-watchdog.yml` | Hourly fallback schedule (24/day) | Every 6 hours (4/day) | Both `workflow_run` completion triggers and manual dispatch remain |
| `senior-agent-watchdog.yml` | Every 6 hours (4/day) | Daily at 06:17 UTC (1/day) | Same full security/quality audit, plus manual dispatch and separate PR/commit security CI |
| `codeql.yml` | Overlapping PR/commit analyses can remain concurrently active | Per-PR/per-main cancellation of superseded attempts | No change to CodeQL scans, schedule, query configuration, permissions or results |
| `dataguard-buyer-room-offline-audit.yml` | Repeated attempts can remain concurrently active | Cancel superseded attempts in the same PR or repeated manual main run | All DataGuard inventory, confidentiality and claim-coverage checks retained |

**Scheduled-launch opportunities across these three repetitive workflows:** 52/day before; 9/day after; **43/day fewer, about 82.7%**. This is a *trigger-frequency calculation for only these three workflows*, not observed saved billed minutes or a claim that 82.7% of the repository's total usage is eliminated. Actual billed-minute savings depend on runner queueing, cancellations, cache and how long individual jobs run.

Existing required CI on PRs and commits, including CodeQL, Semgrep, Gitleaks, general CI, Actionlint, dependency scanning and secrets controls, are **not disabled** by this optimisation.

## Regression proof and exact-checkout gate

The repository has six Node built-in tests in `tests/ci/github-actions-budget-regression.test.mjs` which check that critical triggers, check steps, and new cadence/concurrency settings are present. Existing `actionlint.yml` runs the tests as an extra fail-closed step when GitHub Actions execution is available.

To exercise the affected checks locally **from an authenticated working copy of the repository** (no secrets or providers needed):

```bash
node --test tests/ci/github-actions-budget-regression.test.mjs
node --test scripts/ma/audit-buyer-room.test.mjs scripts/ma/check-buyer-coverage.test.mjs
node scripts/ma/audit-buyer-room.mjs
node scripts/ma/check-buyer-coverage.mjs
```

The commands run tests and read-only static verification. They do not send email, deploy, mutate provider accounts, upload the buyer room, perform pentests or operate the DataGuard demo. They must execute in a **real checkout** and their exact SHA/output must be retained before crediting a run as independent evidence. A scoped offline PASS does **not** replace an external assessor's report or an actual GitHub Actions PASS.

## Budget protocol for the account owner

1. Keep current financial settings unchanged while the free-minute allowance is exhausted. The manual billing UI is the authority for any actual outstanding payment.
2. Review GitHub `Settings → Billing and licensing → Budgets and alerts` to understand, and if desired keep, a **zero-paid-spend** budget/limit. Changes to financial settings require owner action.
3. Do **not** spam `Re-run jobs` while jobs fail before starting. Wait for free allowance reset or account billing remediation **without creating charges**.
4. When free execution is restored, run only the minimal exact-main DataGuard check and the applicable security/quality checks once. Record run ID, SHA, test counts, and actual conclusion.
5. If this cost-controlled cadence is insufficient for operations, restore the original cron values through a normal reviewed pull request; security/business controls remain release gates throughout.

## Closure truth

- The buyer room's narrow documentary preparation is fully drafted; the historical controller's formal `9/10=90%` acceptance remains **unchanged** until its own exact-head automated workflow completes successfully or a documented, owner-approved alternative acceptance criterion is established.
- Source-to-production parity, signed creator-to-seller IP title, financial/tax originals, provider transfer, independent terminal assurance and buyer-specific written acceptance remain separate OPEN gates.
- No source-code publicisation, new fees, outbound buyer communications or demo/production mutation is authorised by this cost-control change.
