# External Assurance — Runtime Provider Revalidation — 2026-08-22

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Runtime evidence subject SHA:** `3a3382e385eb54f8e706e31046c8b7d497057527`  
**Production deployment:** `dpl_HNt5846gxC36eaEZbynqJTu69GFN`  
**Canonical tracker:** GitHub issue `#1727`

This ledger records attributable technical/provider observations only. It is not a DPA, legal opinion, provider-contract acceptance, certification, independent pentest, regulator approval, or proof of a final transfer mechanism.

No API keys, tokens, passwords, connection strings, webhook secrets, private contracts, or exact public client project tokens are retained here.

## Current exact-release observations

### Vercel

- The connected target-production deployment `dpl_HNt5846gxC36eaEZbynqJTu69GFN` was observed as `READY`.
- Deployment metadata binds it to Git commit `3a3382e385eb54f8e706e31046c8b7d497057527` on `main`.
- A connected fetch of `https://www.risckcomply.com/pt/trust` returned HTTP `200` on this release.
- The connected Vercel team remains on plan `hobby`. This is an account-plan fact only; contract/DPA sufficiency remains a separate owner/legal/provider decision.

### Sentry

- The current `/pt/trust` response contains `sentry-environment=production` and `sentry-release=3a3382e385eb54f8e706e31046c8b7d497057527`.
- Current client configuration is designed to disable default PII, remove request/user objects before sending, and keep session replay sampling disabled.
- Organization region, account-level DPA acceptance/applicability, retention and transfer treatment remain unresolved.

### Upstash Redis

- Production code uses Upstash Redis as the distributed backend for high-risk rate limiting/security-control state.
- On the exact runtime subject above, a safe unauthenticated request to `/api/internal/metric-snapshots` returned HTTP `429 Too Many Requests` with rate-limit headers.
- The high-risk production rate-limit path is designed to fail closed with HTTP `503 security_control_unavailable` when Redis is not configured or unavailable. Receiving the normal exhausted-limit `429` response therefore proves that the distributed Redis control was bound and responding for this request.
- This proves current Production runtime binding only. The exact Upstash account owner/plan, deployment region(s), retention/deletion behavior, DPA applicability, transfer terms and subprocessor-notice treatment remain open.
- The rate-limit boundary may process operational request/control identifiers. No secret value or customer content was inspected to produce this evidence.

### PostHog

- The current Production client bundle contains a populated PostHog public project identifier and uses EU PostHog API/assets endpoints.
- The connected PostHog assurance account exposes only one different project, created on 2026-08-22, with no proven ingestion. Exact identifiers are intentionally omitted.
- Therefore the connected assurance project must **not** be treated as the Production project or as account-specific evidence for Production retention, region, DPA or processing settings.
- Current classification: `PRODUCTION_BINDING_PRESENT / CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN`.

### Supabase

- The connected Production project remains the established `eu-west-1` project.
- The connected organization remains on plan `free`.
- Plan-specific recovery, backup/PITR entitlement and final contractual resilience claims remain outside the scope of this ledger and must not be inferred from protected ephemeral rehearsal evidence.

### Stripe

- The connected LIVE account identity remains attributable to RISCK COMPLY SAAS.
- The connector does not expose account country in the current evidence path, so the exact applicable contracting/DPA entity remains open.

### Resend / transactional email

- Repository runtime supports Resend-backed delivery, but no new attributable current-Production send or account binding was established in this revalidation.
- `RESEND_CURRENT_PRODUCTION_BINDING` remains `OPEN`; historical delivery evidence must not be promoted to current exact-release proof.

## Release compatibility observation

PR `#1780` was merged into the runtime subject above to restore pre-V19 maintenance/email compatibility. The resulting Production deployment is `READY`, and a scoped runtime-error query found no errors for `/api/intelligence/refresh` or `/api/internal/compliance-alerts` in the inspected post-deploy window. This is stability evidence, not proof that both internal routes executed successfully after deployment.

## Explicit limitations

This ledger does not prove:

- a signed or accepted provider DPA for any account unless separately evidenced;
- the legal controller/processor/subprocessor classification of a provider;
- a final international-transfer mechanism;
- contractual uptime, support, backup, RPO or RTO commitments;
- independent pentest completion or retest acceptance;
- qualified legal approval of the public legal drafts.

`PROVIDER_RUNTIME_FACTS: PARTIALLY_PROVEN`

`PROVIDER_ACCOUNT_LEGAL_FACTS: INCOMPLETE`

`EXTERNAL_ASSURANCE_CLOSURE: NO_PASS_YET`
