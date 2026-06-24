# Enterprise Final Readiness Plan

Date: 2026-06-25  
Repository: `renanescola40-afk/eurocomply_saas`  
Assessment target: public production and enterprise pilot readiness  
Current decision: **No-Go**

This plan records the current production and enterprise readiness posture for EuroComply. It intentionally does not claim that the product is enterprise-ready while runtime evidence, external review evidence, owner approval, deployment proof, and rollback proof remain incomplete.

## Executive decision

EuroComply is not ready for public production or enterprise pilot promotion at this time.

The codebase contains substantial enterprise controls, including RBAC helpers, API guard checks, audit-chain implementation, RLS validation tooling, CI workflows, Stripe webhook controls, upload scanning validation, no-store response helpers, and security documentation. However, the release gates require live target evidence and approval records that are still Open, missing, or not tied to the promoted commit.

Allowed internal use while blockers remain open:

- development validation;
- private internal security review;
- controlled pre-production smoke testing with synthetic data;
- external pentest preparation.

Not allowed while blockers remain open:

- public production launch;
- enterprise pilot launch;
- enterprise procurement representation as externally validated;
- customer-facing claims that runtime Supabase tenant isolation, MFA/IdP step-up, upload fail-closed behavior, Stripe billing, rollback, or external review are complete unless the relevant evidence files are updated from real target execution.

## Production and enterprise blockers

### P0 — release blocking

| ID | Blocker | Current status | Required closure evidence | Owner |
| --- | --- | --- | --- | --- |
| P0-01 | Promoted commit lacks complete command evidence for `npm ci`, lint, typecheck, tests, build, security CI, route quality, and route E2E when configured. | Open | CI run URL plus logs/artifacts for the exact promoted commit. | @renansilva2002 / release owner |
| P0-02 | Supabase live RLS/tenant-isolation proof is `Open`/`not_run`. | Open | `docs/security/evidence/runtime/supabase-live-rls-validation.json` set to `Complete`/`passed` by `scripts/security/run-supabase-live-tenant-isolation.mjs` or the trusted workflow. | Security owner |
| P0-03 | Audit-chain implementation evidence exists, but target Supabase live proof is still required. | Open for enterprise | `docs/security/evidence/runtime/audit-chain-live-validation.json` set to `Complete` after target run and reviewer proof. | Security owner |
| P0-04 | External security review/pentest evidence is a placeholder. | Open | Real third-party or approved external review report reference, triage, risk acceptance records, and retest evidence where required. | Security owner |
| P0-05 | Real MFA/IdP step-up provider evidence is missing for enterprise. | Open | Runtime validation from Supabase MFA or enterprise IdP with redacted evidence. | Security owner |
| P0-06 | Stripe runtime proof is not attached to the promoted commit. | Open | Focused Stripe route/webhook test run and `docs/security/evidence/runtime/stripe-billing-validation.json` generated in CI or controlled runtime. | Release owner |
| P0-07 | Upload scanner live/fail-closed proof must be tied to the target environment for enterprise mode. | Open until target run attached | Runtime upload scanner evidence with clean, non-clean, unavailable, and timeout behavior. | Security owner |
| P0-08 | Vercel production deployment proof and final deployment URL are missing/failing. | Open | Successful deployment URL, build URL, build logs, and commit SHA. | Release owner |
| P0-09 | Incident owner, rollback owner, support owner, customer communication owner, approver, and previous known-good deployment are missing from the final approval record. | Open | Signed `docs/RELEASE_APPROVAL_RECORD.md` and updated Go/No-Go checklist. | Release owner |
| P0-10 | High/critical dependency status for the promoted commit is not attached. | Open | `npm audit` JSON/summary and triage for every high/critical advisory. | Security owner |

### P1 — should close before public production, may be accepted only with explicit non-enterprise exception

| ID | Item | Status after this PR | Required next step |
| --- | --- | --- | --- |
| P1-01 | `security:ci` previously depended on a live RLS command that required credentials, while workflows rewrote `package.json` at runtime to make CI advisory. | Fixed in this PR | Verify `npm run security:ci` uses `security:rls:advisory` and that `release:enterprise-readiness` still runs live RLS. |
| P1-02 | Workflows mutated `package.json` during CI using `npm pkg set`, weakening reproducibility and evidence integrity. | Fixed in this PR for the main security, full suite, secret scanning, and SBOM workflows | Run workflows and confirm `git diff -- package.json package-lock.json` is empty after install. |
| P1-03 | Baseline CI skipped typecheck/tests for changes classified as non-app changes. | Fixed in this PR | Confirm the `CI / quality` job runs lint, typecheck, and tests on every PR/push. |
| P1-04 | Stripe runtime proof workflow used older action/runtime conventions. | Fixed in this PR | Run the workflow and attach artifact to release evidence. |
| P1-05 | Route E2E proof depends on a configured deployment runtime. | Open | Configure `E2E_BASE_URLS` or equivalent deployment URL vars and run `npm run quality:routes:e2e`. |
| P1-06 | Branch protection evidence must confirm required checks, review policy, CODEOWNERS, force-push/deletion restrictions, and required conversation resolution. | Open unless latest evidence says Complete | Run `.github/workflows/p0-branch-protection-evidence.yml` and attach generated evidence. |
| P1-07 | Observability and incident response evidence must be tied to production runtime, alert routes, owner escalation, and customer communication path. | Open | Attach Sentry/Vercel/logging/status-page evidence and owner sign-off. |

### P2 — hardening and procurement polish

| ID | Item | Required next step |
| --- | --- | --- |
| P2-01 | Procurement trust package needs final alignment with real external report references and final release approval. | Update trust docs only after P0 evidence is complete. |
| P2-02 | Customer communication templates should include final status page URL, support owner, and escalation SLAs. | Update after owner assignment. |
| P2-03 | Dependency ranges should be periodically reviewed for pinning strategy, SBOM attestation, and Renovate/Dependabot policy. | Keep lockfile deterministic and record accepted floating ranges. |
| P2-04 | Performance and capacity evidence should be refreshed for the production deployment URL. | Run load/performance baseline after Vercel deployment is stable. |

## Changes made in this readiness pass

This branch applies only changes that can be made safely without secrets or invented evidence.

- Added `security:rls:advisory` and changed `security:ci` to use advisory repository-side RLS checks.
- Preserved strict live RLS validation in `security:rls`, `security:rls:live`, and `release:enterprise-readiness`.
- Removed runtime `npm pkg set` manifest mutation from security CI, full security suite, secret scanning, and SBOM attestation workflows.
- Changed the baseline CI workflow to run lint, typecheck, and tests deterministically instead of skipping typecheck/tests for selected change classes.
- Hardened Stripe runtime proof workflow to use current Node/action baselines, deterministic install, credentials-disabled checkout, and concurrency control.
- Added `docs/security/evidence/runtime/enterprise-final-readiness-validation.json` as a safe Open evidence record documenting the current No-Go status.

## Required validation commands

Run these commands from a clean checkout of the candidate branch or promoted commit:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
npm run quality:routes
```

Run E2E route validation only after the deployment runtime is configured:

```bash
E2E_BASE_URLS="https://<preview-or-production-url>" npm run quality:routes:e2e
```

For enterprise readiness, after credentials and target environment are configured, run:

```bash
RELEASE_TARGET=enterprise npm run security:rls
RISCK_COMPLY_ENTERPRISE_RELEASE=true npm run security:step-up
RELEASE_TARGET=enterprise RISCK_COMPLY_ENTERPRISE_RELEASE=true npm run security:upload-scanner:runtime
RELEASE_TARGET=enterprise npm run release:readiness
```

## Credential-dependent validation checklist

Do not commit credentials, provider responses, screenshots containing secrets, tokens, cookies, service-role keys, or customer data. Store sensitive artifacts only in the approved private evidence store and commit redacted references.

### Supabase live RLS

Required environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Required command:

```bash
npm run security:rls:live
```

Expected safe evidence:

- `docs/security/evidence/runtime/supabase-live-rls-validation.json`
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`
- status `Complete`
- outcome `passed`
- no secrets or access-granting values

### Audit-chain live target proof

Required environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AUDIT_CHAIN_SIGNING_SECRET=...
EVIDENCE_PACK_SIGNING_SECRET=...
AUDIT_CHAIN_LIVE_ORGANIZATION_ID=...
```

Required commands:

```bash
node scripts/security/run-audit-chain-live-validation.mjs
AUDIT_CHAIN_LIVE_PROOF=true node scripts/security/run-audit-chain-live-validation.mjs
```

Expected safe evidence:

- `docs/security/evidence/runtime/audit-chain-live-validation.json`
- status `Complete`
- target-live proof attached without credentials
- synthetic organization/test data only

### Step-up MFA/IdP runtime proof

Required environment for Supabase MFA mode:

```bash
RISCK_COMPLY_ENTERPRISE_RELEASE=true
STEP_UP_PROVIDER_MODE=supabase_mfa
STEP_UP_SIGNING_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Required command:

```bash
npm run security:step-up:runtime
```

Expected safe evidence:

- `docs/security/evidence/runtime/step-up-mfa-validation.json`
- real provider mode documented
- challenge and verification proof redacted
- no shared secrets or user tokens

### Upload malware/content scanning

Required environment for ClamAV proof or equivalent real provider:

```bash
REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true
MALWARE_SCANNER_PROVIDER=clamav
MALWARE_SCANNER_CLAMAV_HOST=127.0.0.1
MALWARE_SCANNER_CLAMAV_PORT=3310
MALWARE_SCANNER_TIMEOUT_MS=30000
```

Required command:

```bash
npm run security:upload-scanner:runtime
```

Expected safe evidence:

- `docs/security/evidence/runtime/upload-malware-scan-validation.json`
- clean verdict allowed
- non-clean verdict rejected
- scanner unavailable/timeout fails closed
- provider response bodies not persisted

### Stripe billing and webhook proof

Required environment for runtime/integration proof:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://<validated-preview-or-production-url>
STEP_UP_SIGNING_SECRET=...
```

Required commands:

```bash
npx vitest run src/app/api/billing/checkout/route.test.ts src/app/api/billing/portal/route.test.ts src/app/api/stripe/webhook/route.test.ts src/app/api/billing/webhook/route.test.ts src/server/billing/stripe-webhooks.test.ts
node scripts/security/run-stripe-runtime-validation.mjs
```

Expected safe evidence:

- `docs/security/evidence/runtime/stripe-billing-validation.json`
- missing/invalid webhook signatures rejected
- duplicate webhook events idempotent
- checkout and portal require auth, organization context, RBAC, trusted origin, rate limiting, and step-up

### External security review or pentest

Required evidence:

- private external report reference;
- vendor/reviewer;
- test dates;
- scope and methodology;
- findings triage;
- risk acceptances with owner, approver, rationale, expiry, and compensating controls;
- retest evidence for critical/high findings where required.

Expected safe committed evidence:

- `docs/security/evidence/runtime/external-security-review-or-pentest.json`
- status `Complete` only after real external report review
- no exploit details or credentials committed

### Deployment, rollback, owners, and customer communication

Required evidence:

- successful Vercel deployment URL;
- Vercel build URL/log excerpt;
- promoted commit SHA;
- previous known-good deployment URL/SHA;
- rollback trigger and rollback owner;
- incident owner;
- support owner;
- customer communication owner;
- final approver;
- customer/status-page communication decision.

Expected committed evidence:

- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`

## Go/No-Go rule for the next review

The next review may change the decision only as follows:

- **No-Go**: any P0 remains Open, missing, failed, not attached to the promoted commit, or contradicted.
- **Conditional Go**: only allowed for non-enterprise, non-P0 operational gaps with owner, expiry date, and accepted risk. It is not allowed to bypass missing live RLS, external review, step-up provider, upload fail-closed proof, Stripe webhook validation, or rollback owner/sign-off.
- **Public Production Go**: all public production gates pass, no P0 open, CI/build/deploy evidence attached for the promoted commit, and owners/rollback/customer communication are approved.
- **Enterprise Pilot Go**: all enterprise pilot gates pass, including target-live Supabase RLS, audit-chain, real MFA/IdP, upload fail-closed proof, Stripe validation, external review status, and critical/high finding disposition.
- **Enterprise Procurement Go**: enterprise pilot gates pass plus real external review/pentest evidence and procurement-safe trust package updates.

## Final assessment

Current status remains **No-Go**.

The changes in this branch improve release evidence integrity and CI determinism, but they do not and cannot replace target-environment evidence, external review evidence, deployment proof, owner sign-off, rollback proof, or customer communication approval.
