# Provider account and runtime reconciliation — 2026-08-23

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Runtime evidence subject SHA:** `9c0801d46090f63b05fc0b7d8087e0e9313a525b`  
**Canonical tracker:** GitHub issue `#1727`

This ledger records attributable provider-account and Production observations captured on 2026-08-23. It supplements, and does not rewrite, the historical 2026-08-22 ledger. It is not a legal opinion, DPA acceptance on behalf of the owner, certification, independent pentest, regulator approval, or permission to incur provider spend.

No secrets, private keys, payment instruments, bank details, personal identity details, private contracts, or exact public analytics project tokens are retained here.

## Current exact-release observations

### Vercel

- The connected Production deployment for `main` was observed `READY` and attributable to runtime subject `9c0801d46090f63b05fc0b7d8087e0e9313a525b`.
- The connected Vercel team is now on plan `pro`; the prior Hobby-plan observation is stale and must not be used as current account truth.
- The current exact deployment had no observed `error`/`fatal` runtime log entries and no observed HTTP `5xx` responses in the inspected post-deploy window.
- Vercel provider material states the DPA processor regime applies to Pro and Enterprise customers. Final contracting-entity, retention, transfer and legal-sufficiency treatment remains qualified-review work.

### Supabase

- The connected Production project is `ACTIVE_HEALTHY` in `eu-west-1` and belongs to the same connected organization observed on plan `pro`.
- The prior Free-plan observation is stale and must not be used as current account truth.
- A direct Supabase Privacy Team response states that, effective 2026-08-01, customers no longer need to request or separately sign the DPA because it is incorporated into the Terms and its protections apply automatically to customers.
- The live Security Advisor no longer reports the leaked-password-protection advisory that was previously present. This is supporting evidence only; the strict provider-resilience gate still requires the Management API auth configuration to report leaked-password protection enabled.
- Supabase documents automatic daily backups for Pro projects. The canonical resilience gate still requires an attributable managed-backup observation before promoting that control.
- PITR is a separately enabled paid capability and was not proven active or enabled by this reconciliation. No spend or provider configuration change was made.
- A read-only Production schema query confirmed that `compliance_metric_snapshots` exists but remains partially incompatible with the V19 metric-snapshot contract: `open_tasks`, `open_risks`, `critical_risks`, `high_risk_vendors`, and `missing_documents` are absent. No DDL was executed. Metric snapshots must remain fail-closed/disabled until the schema is proven compatible.

### Stripe

- The connected LIVE Stripe account is configured for country `PT` and business type `individual`.
- The LIVE account is Standard, has charges and payouts enabled, and exposes no currently due account requirements in the captured account response.
- No personal identity, address, bank, phone, email, verification-document, or network data from that response is retained in this ledger.
- Account-country evidence makes the standard European Stripe contracting/DPA path attributable to this account; final legal interpretation remains qualified-review work.
- A read-only LIVE API inventory returned zero PaymentIntents, zero subscriptions across all statuses, and zero Checkout Sessions. Therefore a genuine customer LIVE checkout/subscription lifecycle remains unproven and must not be fabricated for readiness scoring.

### Sentry

- The current Production client bundle is bound to the exact runtime subject above and reports `production` as its environment.
- The configured Sentry ingestion endpoint is in the German/European ingestion region. Exact DSN, organization and project identifiers are intentionally omitted.
- Client privacy guardrails disable default PII, strip request/user objects before send, and keep session replay sampling disabled.
- Sentry support states that account-level DPA acceptance must be checked inside the organization Legal & Compliance settings; only an Owner/Billing member can accept it. This reconciliation does not accept the DPA on the owner's behalf.
- Account-level DPA acceptance, retention and final transfer/legal treatment therefore remain open.

### PostHog

- The Production client targets PostHog EU API/assets endpoints and contains a populated public project token.
- The connected assurance organization exposes only one different, newly created `Default project` with no ingested events and incomplete onboarding.
- The Production token and connected assurance project token were compared without retaining either value and do not match.
- Therefore the connected assurance project is not the Production analytics project and must not be used as Production account evidence.
- Current classification: `PRODUCTION_BINDING_PRESENT / CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN`.

### Resend / transactional email

- Current provider-standard material states that the Resend DPA is incorporated into the service agreement, with US primary data storage and documented transfer mechanisms and deletion/backup boundaries.
- This ledger did not directly observe the protected exact-main Production Provider Runtime Proof artifact produced by the #1790 contract. Therefore it does not independently promote current exact-release Resend binding, sender-domain verification, or delivery availability.
- Domain verification, account-specific plan/entity facts and real delivery availability remain open unless separately evidenced.

### Upstash Redis

- The distributed high-risk rate-limit backend remains previously proven by attributable Production behavior and is retained as `RUNTIME_BINDING_PROVEN`.
- Provider-standard material states that the Upstash DPA is incorporated into its agreement and documents standard transfer/deletion mechanisms.
- Exact account plan, account owner, region configuration and retention specifics remain `ACCOUNT_LEGAL_FACTS_OPEN` until attributable account evidence is captured.

### Malware/content scanner

- #1790 hardened the protected runtime-proof contract for malware scanning provider selection and transport bindings.
- This ledger did not directly observe the protected exact-main provider-proof artifact. It therefore does not independently promote current provider identity/binding or contractual facts.

## Production health observation

The current exact-main Production deployment was observed `READY`. In the inspected post-deploy window, no `error`/`fatal` runtime log entries and no HTTP `5xx` responses were observed for that deployment. This is bounded runtime-health evidence, not an uptime SLA or proof that every route and provider path executed successfully.

## Explicit limitations

This reconciliation does not prove or perform:

- the exact-main protected Production Provider Runtime Proof result;
- the exact-main Enterprise Recovery Drill result;
- PITR activation or any paid Supabase add-on;
- Production schema migration or DDL;
- a genuine Stripe customer transaction where none exists;
- Sentry DPA acceptance;
- recovery of the actual PostHog Production account;
- sender-domain verification or real transactional-email delivery;
- independent pentest completion/retest acceptance;
- qualified legal approval of final Privacy, Terms, DPA or subprocessor language.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: UPDATED_2026_08_23`

`VERCEL_PLAN: PROVEN_PRO`

`SUPABASE_PLAN: PROVEN_PRO`

`SUPABASE_DPA_APPLICABILITY: PROVEN`

`STRIPE_ACCOUNT_COUNTRY: PROVEN_PT`

`SENTRY_PRODUCTION_REGION: PROVEN_EU_DE`

`POSTHOG_CONNECTED_ASSURANCE_PROJECT: NOT_PRODUCTION`

`UPSTASH_RUNTIME_BINDING: PROVEN`

`EXTERNAL_ASSURANCE_CLOSURE: NO_PASS_YET`
