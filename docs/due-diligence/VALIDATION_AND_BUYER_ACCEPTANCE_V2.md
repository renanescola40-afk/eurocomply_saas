# Technical Due Diligence — Validation Strategy and Buyer Acceptance V2

Updated: 2026-10-14. Baseline: `main` commit `5dcddfd86af75329afcf53bc20fe607c6ceed2f6`. Documentation-only, not a runtime certification.

## Branch and provenance

Previous documentation PR #2450 was merged on 2026-10-14 at 11:42:50 UTC, outside this controller's merge actions. A new isolated branch `codex/dataguard-technical-diligence-v2` was therefore created from the later baseline above. This document does not authorize a new merge or deployment.

## Test configuration findings

- `vitest.config.ts`: Node environment, tests in `tests/**/*.test.ts` and `src/**/*.test.ts`, setup in `tests/setup-env.ts`, alias for `server-only` mock. **Static inspection only**.
- `playwright.config.ts`: Chromium project, global setup `tests/e2e/payment-first-runtime-global-setup.ts`, optional `E2E_BASE_URL`, and an automatic Next.js web server if no external base URL is supplied. When `CI` is false, reuse of an existing server is enabled. Hence Playwright commands should not be considered safe without review of global setup, endpoint and fixtures.
- `src/server/billing/stripe-webhook-recovery.ts`: recoverable event type set includes subscription and invoice events; lease window is 15 minutes; uses elevated Supabase client for processing ledger. Require isolated verification of event-idempotency, concurrent claims, retries, entitlements and email side effects.
- `docs/security/NPM_AUDIT_TRIAGE.md`: documents high/critical vulnerability release blockers and audit artifacts; sample triage table is not evidence that current advisories are zero.

## Test execution and validation matrix

| Test family | Required evidence | Status | Safeguards |
|---|---|---|---|
| Unit tests / Vitest | Full output, exit code, tested SHA | NOT RUN | First inspect `tests/setup-env.ts` and any external effects |
| TypeScript | `npm run typecheck` output, exit code | NOT RUN | Use an isolated checkout |
| ESLint | `npm run lint` output, exit code | NOT RUN | Confirm config and disk effects |
| Next.js build | `npm run build` output, exit code | NOT RUN | Confirm prebuild hook and environment are isolated |
| Playwright | Global setup, fixtures, URL, pass/fail and traces | NOT RUN | **Do not run** until no production/demo connection is provable |
| Tenant A/B authorization | Active, revoked, suspended, wrong-tenant cases | NOT RUN | Disposable local tenants only |
| Stripe billing parity | invoice-first, replay, signature mismatch, enterprise vs self-serve | NOT RUN | Stripe mocks/test environment only; no live checkout |
| Supply chain | Fresh SBOM, npm audit, license obligations | NOT RUN | Source-only/reproducible environment |

No outcome in this matrix has a PASS designation.

## Acceptance criteria per required buyer document

- D01 Architecture Overview: system context, container, component, flows and reconciled trust boundaries, traceable to code.
- D02 Source-Code Asset Inventory: complete tree manifest, exclusions, generated assets, provenance and source SHA.
- D03 Functional Capability Matrix: all features, routes, authorization, database, test links and operational evidence.
- D04 Route/API/Action Inventory: exhaustive parser output with request verbs and call graph.
- D05 Database Dependency Map: migrations, tables, constraints, RLS, storage and tenancy relationships.
- D06 Third-Party License Inventory: lockfile-matched resolved dependency list, SBOM and counsel-sensitive flags.
- D07 Integration Boundary Matrix: credential ownership, allowed data, auth protocols, failure modes and operator controls.
- D08 Technical Debt Register: reproduced defects, severity, impact, owner and remediation status.
- D09 Test Coverage Report: tested SHA, commands, exit codes and environments; untestable scopes disclosed.
- D10 Build-versus-Buy Analysis: scoped engineering effort assumptions and transparent cost ranges; no fabricated valuation.
- D11 Handover Plan: repo access, deployment configuration, providers, rotations, runbooks and recoverability.
- D12 Limitations: known restrictions, unverified claims, demo safeguards and buyer sign-off dependencies.

A document is not marked COMPLETE merely because a markdown file exists. Strict buyer-grade completion = count of independently validated items / 12.

## Priority register

1. **P1 verification risk**: Playwright global setup must be checked before invoking any E2E commands.
2. **P1 verification risk**: Ensure the two Stripe webhook paths produce equivalent entitlement authority across invoice-first event order. Difference in `syncStripeSubscriptionForInvoiceEvent` call remains review-only, not a confirmed exploit.
3. **P1 verification risk**: Confirm isolated tenant authority with current membership and legacy schema fallback; runtime evidence outstanding.
4. **P2 evidence gap**: Test suite, build output and current SHA environment have no observed execution.
5. **P2 acquisition evidence gap**: Third-party license inventory has historical internal snapshot, not independently reviewed accepted-SHA report.

## Current scoring

**Prepared/in-progress working documents: 4 out of 12 topics (33.3% thematic coverage); independently complete buyer deliverables: 0/12 (0%); remaining to complete under strict criteria: 100%.**

This is not a measure of software development completion. Zero code fixes and zero executed tests by this controller on this turn. No production mutation, no DataGuard modifications, no communications.
