# External Assurance — Runtime Provider Revalidation — 2026-08-24

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Original provider-runtime evidence subject SHA:** `b8b099b9018f0be0de8f419d4c7d4a8629700d42`  
**Original observed Production deployment:** `dpl_Doqc3EAUXnV9M2oM3AFscyfbkCAE`  
**Latest superseding Production deployment subject:** `75151c463ea7bf54c74e4dc9e5cd3af995615eae`  
**Latest superseding Production deployment:** `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx`  
**Current serving state:** `BLOCKED_402_DEPLOYMENT_DISABLED`  
**Canonical provider tracker:** GitHub issue `#1727`  
**Current Production outage tracker:** GitHub issue `#1814`

This ledger records attributable technical/provider observations only. It is not a DPA, legal opinion, provider-contract acceptance, certification, independent pentest, regulator approval, or proof of a final transfer mechanism.

No API keys, tokens, passwords, connection strings, webhook secrets, private contracts, personal KYC fields, or exact public client project tokens are retained here.

## Historical provider-runtime observation — `b8b099...`

The observations in this section were genuinely captured while `b8b099b9018f0be0de8f419d4c7d4a8629700d42` was the serving Production release. They remain historical provenance. They must not be represented as proof that the later `75151c...` deployment is currently serving.

### Vercel

- Target-production deployment `dpl_Doqc3EAUXnV9M2oM3AFscyfbkCAE` was observed as `READY` and bound to `b8b099b9018f0be0de8f419d4c7d4a8629700d42` on `main`.
- The canonical aliases included `www.risckcomply.com` and `risckcomply.com`.
- `/api/health` returned HTTP `200` with `{"status":"ok"}` on that observed serving release.
- The connected Vercel team was and remains on plan `pro`. The former Hobby-plan mismatch is superseded and must not be presented as current.
- Deployment metadata identified `iad1` as the function region for that deployment. Runtime-region metadata is not, by itself, a legal statement about all provider processing/storage locations or transfer mechanisms.

### Supabase

- The connected Production project is `tganhbbhfxcpblmgqprg`, status `ACTIVE_HEALTHY`, in `eu-west-1`.
- The connected organization is on plan `pro`. The former Free-plan mismatch is superseded and must not be presented as current.
- Provider-confirmed standard contractual facts separately establish that the current Supabase DPA is incorporated into the standard agreement and includes applicable SCC mechanics; account-specific superseding agreements remain a separate residual check.
- The pre-V19 application/schema runtime compatibility issue `#1778` is **closed** by merged PR `#1780` (`3a3382e385eb54f8e706e31046c8b7d497057527`). That closure introduced bounded compatibility behavior without direct Production DDL, migration-history repair, unrestricted `db push`, or RLS weakening. Any later governed V19 promotion is a separate migration-authority decision and must not be confused with #1778.

### Stripe

- The connected LIVE account is `RISCK COMPLY SAAS` and is operating in livemode.
- A prior attributable LIVE account read on 2026-08-24 established country `PT`, account type `standard`, `business_type=individual`, `charges_enabled=true`, `payouts_enabled=true`, and `details_submitted=true`. Sensitive personal/KYC fields are intentionally not retained here.
- Current operational billing enablement is therefore distinct from the unresolved operator-entity question: the LIVE account is not presently evidenced as company-linked.
- Standard EEA provider/DPA material is available separately; final account/entity alignment must follow the owner/counsel decision on the existing company and must not be inferred from billing enablement.

### Sentry

- The serving Production response on `b8b099...` contained Sentry tracing metadata with `sentry-environment=production` and exact `sentry-release=b8b099b9018f0be0de8f419d4c7d4a8629700d42`.
- This proves attributable release binding for that serving release without retaining the public project key/DSN.
- A human Sentry support representative confirmed that free/self-service customers rely on the provider's public Terms, Privacy, Security/Compliance, Trust Center and DPA materials; individualized questionnaires are limited to Enterprise agreements.
- Organization-specific region and DPA acceptance actor/timestamp remain account-owner-visible facts and are not proven by the runtime binding.

### PostHog

- The attributable Production client bundle on the serving evidence baseline targets EU PostHog API/assets endpoints.
- The connected PostHog assurance organization exposes only one different `Default project`, created on 2026-08-22, with no ingested event; it must not be treated as the Production project.
- Human provider support separately confirmed the EU Cloud location as Frankfurt and that an account-linked countersigned DPA is generated from the organization Legal page.
- Classification: `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / CONNECTED_ASSURANCE_PROJECT_MISMATCH / PRODUCTION_ACCOUNT_RECOVERY_OPEN`.
- Exact project identifiers/tokens are intentionally omitted.

### Resend / transactional email

- Standard provider terms/DPA material is available separately and includes the provider's current DPA framework.
- No attributable send or runtime log on the exact serving evidence baseline was observed during the scoped revalidation.
- `RESEND_CURRENT_EXACT_SERVING_RELEASE_BINDING` remains `OPEN`; historical delivery evidence must not be promoted to current exact-serving-release proof.

### Upstash / Redis

- Historical predecessor-release runtime evidence proved distributed Redis binding through normal rate-limit behavior.
- On the `b8b099...` evidence baseline, a safe unauthenticated call to the internal metric endpoint returned `401` before reaching the rate-limit/data-plane path, and scoped runtime-log searches did not produce an attributable exact-release Upstash execution.
- Therefore `UPSTASH_CURRENT_EXACT_SERVING_RELEASE_REPROOF` remains `OPEN`. Historical binding remains provenance only.
- Exact account/plan/region, retention/deletion, DPA applicability and transfer/subprocessor facts remain open.

## Latest superseding Production serving-state observation — `75151c...`

After PR `#1813` merged, protected `main` moved to `75151c463ea7bf54c74e4dc9e5cd3af995615eae` and Vercel automatically created Production deployment `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx`.

Attributable observations:

- deployment target is `production`;
- Git metadata binds it exactly to `main@75151c463ea7bf54c74e4dc9e5cd3af995615eae`;
- deployment reached `READY`;
- canonical aliases include `risckcomply.com` and `www.risckcomply.com`;
- the Vercel project reports `live=false`;
- the exact deployment URL `/api/health` returned HTTP `402 Payment Required` with `x-vercel-error: DEPLOYMENT_DISABLED`;
- canonical `https://risckcomply.com/api/health` returned the same HTTP `402` and `DEPLOYMENT_DISABLED` response;
- the connected Vercel team still reports plan `pro`.

The build itself was healthy:

- exact `75151c...` source was cloned;
- `npm ci --ignore-scripts` completed and reported `0 vulnerabilities`;
- Zod compatibility check returned `ok`;
- the optimized Next.js Production build compiled successfully;
- only non-fatal lint and Sentry source-map/release-token warnings were observed before deployment reached `READY`.

This is therefore a **serving/account-or-usage-state failure**, not current evidence of an application build failure. Canonical P0 is `#1814`.

No paid action, plan purchase, billing acceptance, provider migration, new account/company creation, Production DDL, or pentest authorization was performed while investigating this state.

## Provider/account facts materially closed without legal over-promotion

- `VERCEL_HOBBY_PLAN_MISMATCH: RESOLVED` — connected team is Pro. Separate serving outage #1814 is open.
- `SUPABASE_PLAN_MISMATCH: RESOLVED` — connected organization is Pro.
- `PRE_V19_RUNTIME_COMPATIBILITY_1778: CLOSED_VIA_1780`.
- `SENTRY_ATTRIBUTABLE_RELEASE_BINDING: PROVEN` for the last serving evidence baseline; a new serving-release reproof is blocked by #1814.
- `POSTHOG_CURRENT_RELEASE_EU_ENDPOINT_BINDING: PROVEN` as integration/configuration evidence; Production account recovery remains open.
- `STRIPE_LIVE_CONTROL_PLANE: PROVEN`.
- `STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN` because the current LIVE account is configured as an individual.

## Explicit limitations

This ledger does not prove:

- that the current `75151c...` Vercel deployment is serving application traffic — it is explicitly observed as disabled;
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

`VERCEL_PRODUCTION_SERVING: BLOCKED_402_DEPLOYMENT_DISABLED`

`PRE_V19_RUNTIME_COMPATIBILITY_1778: CLOSED_VIA_1780`

`EXTERNAL_ASSURANCE_CLOSURE: NO_PASS_YET`
