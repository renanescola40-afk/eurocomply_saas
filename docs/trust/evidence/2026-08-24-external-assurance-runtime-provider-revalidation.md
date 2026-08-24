# External Assurance — Runtime Provider Revalidation — 2026-08-24

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Runtime evidence subject SHA:** `b8b099b9018f0be0de8f419d4c7d4a8629700d42`  
**Production deployment:** `dpl_Doqc3EAUXnV9M2oM3AFscyfbkCAE`  
**Canonical tracker:** GitHub issue `#1727`

This ledger records attributable technical/provider observations only. It is not a DPA, legal opinion, provider-contract acceptance, certification, independent pentest, regulator approval, or proof of a final transfer mechanism.

No API keys, tokens, passwords, connection strings, webhook secrets, private contracts, personal KYC fields, or exact public client project tokens are retained here.

## Exact-release observations

### Vercel

- The connected target-production deployment `dpl_Doqc3EAUXnV9M2oM3AFscyfbkCAE` was observed as `READY` and bound to `b8b099b9018f0be0de8f419d4c7d4a8629700d42` on `main`.
- The canonical aliases include `www.risckcomply.com` and `risckcomply.com`.
- `/api/health` returned HTTP `200` with `{"status":"ok"}` on the observed release.
- The connected Vercel team is on plan `pro`. The former Hobby-plan mismatch is superseded and must not be presented as current.
- Deployment metadata identifies `iad1` as the function region for this deployment. That runtime-region metadata is not, by itself, a legal statement about all provider processing/storage locations or transfer mechanisms.

### Supabase

- The connected Production project is `tganhbbhfxcpblmgqprg`, status `ACTIVE_HEALTHY`, in `eu-west-1`.
- The connected organization is on plan `pro`. The former Free-plan mismatch is superseded and must not be presented as current.
- Provider-confirmed standard contractual facts separately establish that the current Supabase DPA is incorporated into the standard agreement and includes applicable SCC mechanics; account-specific superseding agreements remain a separate residual check.
- Current Production schema/readiness reconciliation remains separately tracked in `#1778`; this ledger does not treat schema migration state as provider contractual evidence.

### Stripe

- The connected LIVE account is `RISCK COMPLY SAAS` and is operating in livemode.
- A prior attributable LIVE account read on 2026-08-24 established country `PT`, account type `standard`, `business_type=individual`, `charges_enabled=true`, `payouts_enabled=true`, and `details_submitted=true`. Sensitive personal/KYC fields are intentionally not retained here.
- Current operational billing enablement is therefore distinct from the unresolved operator-entity question: the LIVE account is not presently evidenced as company-linked.
- Standard EEA provider/DPA material is available separately; final account/entity alignment must follow the owner/counsel decision on the existing company and must not be inferred from billing enablement.

### Sentry

- The current public Production response contains Sentry tracing metadata with `sentry-environment=production` and exact `sentry-release=b8b099b9018f0be0de8f419d4c7d4a8629700d42`.
- This proves current exact-release Sentry runtime binding without retaining the public project key/DSN.
- A human Sentry support representative confirmed that free/self-service customers rely on the provider's public Terms, Privacy, Security/Compliance, Trust Center and DPA materials; individualized questionnaires are limited to Enterprise agreements.
- Organization-specific region and DPA acceptance actor/timestamp remain account-owner-visible facts and are not proven by the runtime binding.

### PostHog

- The current Production client bundle targets EU PostHog API/assets endpoints.
- The connected PostHog assurance organization exposes only one different `Default project`, created on 2026-08-22, with no ingested event; it must not be treated as the Production project.
- Human provider support separately confirmed the EU Cloud location as Frankfurt and that an account-linked countersigned DPA is generated from the organization Legal page.
- Current classification: `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / CONNECTED_ASSURANCE_PROJECT_MISMATCH / PRODUCTION_ACCOUNT_RECOVERY_OPEN`.
- Exact project identifiers/tokens are intentionally omitted.

### Resend / transactional email

- Standard provider terms/DPA material is available separately and includes the provider's current DPA framework.
- No attributable send or runtime log on the exact current release was observed during the scoped revalidation.
- `RESEND_CURRENT_EXACT_RELEASE_BINDING` remains `OPEN`; historical delivery evidence must not be promoted to current exact-release proof.

### Upstash / Redis

- Historical predecessor-release runtime evidence proved distributed Redis binding through normal rate-limit behavior.
- On the current release, a safe unauthenticated call to the internal metric endpoint returned `401` before reaching the rate-limit/data-plane path, and scoped runtime-log searches did not produce an attributable current-release Upstash execution.
- Therefore `UPSTASH_CURRENT_EXACT_RELEASE_REPROOF` remains `OPEN`. Historical binding remains provenance only.
- Exact account/plan/region, retention/deletion, DPA applicability and transfer/subprocessor facts remain open.

## Provider/account facts materially closed without legal over-promotion

- `VERCEL_PLAN_MISMATCH: RESOLVED` — connected team is Pro.
- `SUPABASE_PLAN_MISMATCH: RESOLVED` — connected organization is Pro.
- `SENTRY_CURRENT_RELEASE_BINDING: PROVEN`.
- `POSTHOG_CURRENT_RELEASE_EU_ENDPOINT_BINDING: PROVEN`.
- `STRIPE_LIVE_CONTROL_PLANE: PROVEN`.
- `STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN` because the current LIVE account is configured as an individual.

## Explicit limitations

This ledger does not prove:

- founder/company identity or the final RISCK COMPLY operator/contracting entity;
- a separately negotiated provider agreement where one may supersede standard terms;
- account-specific DPA acceptance where only owner/provider UI can evidence it;
- controller/processor/subprocessor legal classification;
- a final international-transfer mechanism;
- contractual uptime, support, backup, RPO or RTO commitments;
- independent pentest completion or retest acceptance;
- qualified legal approval of public legal drafts;
- customer/procurement acceptance.

`PROVIDER_RUNTIME_FACTS: MATERIALLY_RECONCILED`

`PROVIDER_ACCOUNT_LEGAL_FACTS: PARTIALLY_OPEN`

`EXTERNAL_ASSURANCE_CLOSURE: NO_PASS_YET`
