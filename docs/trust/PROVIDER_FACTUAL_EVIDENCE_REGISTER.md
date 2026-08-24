# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-24  
**Baseline protected main for this reconciliation:** `41cc6656de9a9d9df06b549dc1309d481498758b`  
**Current direct Production runtime subject:** `41cc6656de9a9d9df06b549dc1309d481498758b`  
**Current Production deployment:** `dpl_FEUDn9oPpzetNwZcu3N5qJWmeAtZ`  
**Protected Provider Runtime acceptance:** `OPEN`  
**Canonical tracker:** GitHub issue `#1727`

Protected-main lineage, direct Production runtime facts and protected producer acceptance are separate authorities even when the first two resolve to the same SHA.

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Current and predecessor runtime evidence

- current direct runtime revalidation: `docs/trust/evidence/2026-08-24-current-runtime-provider-revalidation-41cc6656.md`
- retained predecessor Upstash proof: `docs/trust/evidence/2026-08-24-upstash-exact-current-runtime-reproof.md`
- retained predecessor Sentry proof: `docs/trust/evidence/2026-08-24-sentry-exact-current-runtime-reproof.md`

The predecessor files preserve their original exact-SHA provenance; they are not relabelled as current-release evidence.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence.
- Direct runtime evidence does not substitute for a protected exact-SHA producer when the control requires protected acceptance.
- Public provider documents can establish general contractual/policy frameworks but do not prove an account-specific acceptance actor/timestamp, custom agreement or final legal role.
- A provider can be technically active while account/legal facts remain open.
- An assurance account is not Production evidence unless it can be attributed to the Production integration.
- Plan defaults are recorded separately from optional add-ons when the add-on state is not owner-visible through the connected tools.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts or user-level identity data when unnecessary.

## Factual reconciliation

| Provider / service | Current attributable fact | Region / retention fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- | --- |
| Vercel | Production deployment `dpl_FEUDn9oPpzetNwZcu3N5qJWmeAtZ` is `READY`, target `production`, ref `main`, attributable to `41cc6656...`; connected team plan is `pro`. Current Vercel DPA covers Pro/Enterprise customers and includes SCC/subprocessor mechanics. | Runtime placement is deployment-specific and does not establish all processing locations. Standard plan defaults remain separate from account add-on state. | `CURRENT_DIRECT_RUNTIME_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_PRO_PLAN_MATCHED / PROTECTED_PROVIDER_PRODUCER_OPEN` | Governed exact-SHA provider producer; add-on state if material; account-specific acceptance/custom agreement; final legal role/transfer interpretation. |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY`; connected organization is `pro`. Fresh read-only inspection shows migration ledger count 33/head `20260822120617`; governed V21 package remains `0/31`. | Project region `eu-west-1` (Ireland). Standard Pro backup defaults are separate from account-specific PITR state. | `PROJECT_REGION_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_FRAMEWORK_PROVEN / V21_0_OF_31 / PRODUCTION_WRITE_NOT_PERFORMED` | Protected S1/S2/S3/Decision Gate/promotion sequence; account-specific PITR/superseding agreement; final retention/transfer/legal-role interpretation. |
| Stripe | Connected account is LIVE, country `PT`, type `standard`, `business_type=individual`, with charges/payouts enabled. Standard EEA DPA/transfer/subprocessor framework is separately evidenced. | Account country is Portugal; provider processing/storage geography is not inferred from that field. | `LIVE_CONTROL_PLANE_PROVEN / ACCOUNT_COUNTRY_PROVEN / STANDARD_FRAMEWORK_PROVEN / OPERATOR_ENTITY_ALIGNMENT_OPEN` | Align account/operator with final existing-company decision if required; applicable account agreement/DPA; genuine customer lifecycle remains separate. |
| Google OAuth / Google Identity | Production Auth contains non-zero Google-provider identities from an aggregate, non-PII query. Application source uses Supabase `signInWithOAuth` with provider `google`. | Exact account processing region, retention and transfer treatment are not established here. | `PRODUCTION_USAGE_PROVEN / AUTH_IDENTITY_PROVIDER / POLICY_FRAMEWORK_PROVEN / LEGAL_ROLE_OPEN` | Applicable contracting entity/terms, DPA applicability if any, region/retention/transfers and qualified legal role classification. |
| Google Workspace | Corporate mailboxes on `risckcomply.com` are actively used for support, security, procurement and legal communications. Account-specific billing evidence proves Business Starter with 2 licenses and Google Cloud EMEA Limited as billed EMEA entity. | Exact account data region, effective retention and onward-transfer treatment are not established by billing evidence. | `ACCOUNT_SERVICE_PROVEN / BUSINESS_STARTER_PROVEN / EMEA_ENTITY_PROVEN / CDPA_SCC_FRAMEWORK_PROVEN_GENERAL / ACCOUNT_INCORPORATION_OPEN` | Exact Workspace agreement/CDPA incorporation or opt-in; account retention/data-region settings if material; qualified legal role/transfer interpretation. |
| GitHub / GitHub Actions | Repository and CI are actively used; protected recovery workflows can transiently process Production database data on GitHub-hosted runners while only redacted evidence is intentionally retained. | Hosted runners are ephemeral per job; company-specific processing region is not established here. | `MATERIAL_OPERATIONAL_PROVIDER / TRANSIENT_PRODUCTION_PROCESSING_PROVEN / PERSONAL_ACCOUNT_CONTRACT_BOUNDARY_OPEN` | Applicable company/account agreement/DPA, final legal role and transfer treatment. |
| Sentry | Fresh current `/pt/trust` on `dpl_FEUD...` exposes `sentry-environment=production` and `sentry-release=41cc6656...`; current redacted direct evidence is retained. The automatic build lacked the protected Sentry auth token, so governed release/source-map producer acceptance is still open. | Public runtime evidence does not establish organization storage region, plan retention or DPA acceptance. | `CURRENT_DIRECT_RELEASE_BINDING_PROVEN / RETAINED_CURRENT_DIRECT_EVIDENCE / PROTECTED_SENTRY_PRODUCER_OPEN / ACCOUNT_DPA_REGION_OPEN` | Governed exact-SHA Sentry producer; owner-visible organization region, plan/retention and DPA acceptance actor/timestamp; final transfer/legal interpretation. |
| PostHog | Production client targets EU endpoints. Connected assurance organization exposes a different project with no ingested event and is not Production. Human support states EU Cloud is Frankfurt and account-linked DPA generation is available from the organization Legal page. | Actual Production account ownership/plan/retention remains unrecovered. | `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / CONNECTED_ASSURANCE_PROJECT_MISMATCH / ACCOUNT_FACTS_OPEN / PRODUCTION_ACCOUNT_RECOVERY_OPEN` | Recover actual Production account/project; account-linked DPA; plan, retention and account settings. |
| Resend / transactional email | Historical real delivery is independently evidenced. Provider standard DPA/SCC/subprocessor/deletion framework is established generally. No attributable send on the current exact release is retained. | Current account/runtime plan, region and effective retention remain unproven. | `HISTORICAL_DELIVERY_PROVEN / PROVIDER_FRAMEWORK_PROVEN_GENERAL / CURRENT_EXACT_RELEASE_BINDING_OPEN` | Current Production binding; account plan/owner and account-specific acceptance/effective agreement evidence. |
| Upstash / Redis | Fresh current canonical `GET /api/billing/catalog` returned HTTP 200 on Production `dpl_FEUD...` / `41cc6656...`; the route traverses the fail-closed distributed billing Redis limiter before normal response. Redacted current direct evidence is retained. | Exact account region/plan/retention remain unproven; generic provider documents do not establish account settings. | `CURRENT_DIRECT_RUNTIME_PROVEN / RETAINED_CURRENT_DIRECT_EVIDENCE / PROVIDER_FRAMEWORK_PROVEN_GENERAL / ACCOUNT_FACTS_OPEN / PROTECTED_PROVIDER_PRODUCER_OPEN` | Governed exact-SHA provider producer; account plan/owner/region; account-specific DPA/agreement acceptance; final retention/transfer/legal interpretation. |
| Malware/content scanner | Runtime policy requires provider-backed scanning when enterprise upload scanning is enabled; exact-current provider identity/binding is not established. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm active provider/scope, data categories, region, retention and legal terms if enabled. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Workspace-specific processing/storage posture is outside current runtime provider evidence. | `FOUNDER_OPERATIONAL_USE_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_OPEN` | Final policy on customer-content use, workspace terms/retention/training posture and qualified legal role. |

## Superseded provider blockers

Do not report these historical states as current:

- `VERCEL_HOBBY_PLAN_MISMATCH` — resolved; connected team is Pro.
- `SUPABASE_FREE_PLAN_MISMATCH` — resolved; connected organization is Pro.
- `STRIPE_ACCOUNT_COUNTRY_OPEN` — resolved; account country is Portugal.
- `SENTRY_CURRENT_RELEASE_BINDING_OPEN` — superseded at the direct-runtime layer by retained current `41cc6656...` public release metadata; protected Sentry producer and account facts remain open.
- `POSTHOG_EU_ENDPOINT_BINDING_OPEN` — resolved for Production endpoint configuration; Production account recovery remains separate.
- `UPSTASH_CURRENT_EXACT_RELEASE_REPROOF_OPEN` — superseded at the direct-runtime layer by retained current `/api/billing/catalog` revalidation on `41cc6656...`; protected producer/account/legal facts remain separate.
- `GOOGLE_OAUTH_USAGE_UNPROVEN` — superseded by non-zero aggregate Production identity evidence.
- `GOOGLE_WORKSPACE_ACCOUNT_USE_UNPROVEN` — superseded by account-specific Business Starter billing evidence and real corporate-mail use.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor/independent-controller role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- provider/subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language.

Public provider terms reduce factual uncertainty but are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA treatment

Protected-main lineage, direct runtime evidence and protected producer acceptance are separate. Current direct release-specific facts are bound to `41cc6656de9a9d9df06b549dc1309d481498758b`. The predecessor evidence files preserve their original SHA and receive no current-release authority. A material runtime, provider configuration, data-flow, region, retention or service-scope change requires revalidation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: MATERIALLY_RECONCILED`

`RUNTIME_BINDING_PROVEN: PARTIAL_BY_PROVIDER / SEE_FACTUAL_RECONCILIATION_MATRIX`

`GOOGLE_OAUTH_PRODUCTION_USAGE: PROVEN`

`GOOGLE_WORKSPACE_ACCOUNT_SERVICE: PROVEN`

`GITHUB_ACTIONS_MATERIALITY: PROVEN`

`SENTRY_CURRENT_EXACT_RELEASE_RUNTIME: DIRECT_PROVEN / PROTECTED_PRODUCER_OPEN`

`UPSTASH_CURRENT_EXACT_RELEASE_RUNTIME: DIRECT_PROVEN / PROTECTED_PRODUCER_OPEN`

`CONNECTED_ASSURANCE_PROJECT_MISMATCH: POSTHOG_CONFIRMED / NOT_PRODUCTION`

`POSTHOG_PRODUCTION_ACCOUNT_RECOVERY: OPEN`

`RESEND_CURRENT_EXACT_RELEASE_BINDING: OPEN`

`MALWARE_SCANNER_CURRENT_PROVIDER_BINDING: OPEN`

`STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN`

`ACCOUNT_LEGAL_FACTS_OPEN: OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`PROTECTED_PROVIDER_RUNTIME_ACCEPTANCE: OPEN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
